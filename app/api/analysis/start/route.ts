import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchRepoCommits, fetchRepoLanguages } from "@/lib/github";
import { analyzeRepository, generateDeveloperReport } from "@/lib/analysis";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const repositoryIds = body.repositoryIds as string[];

  if (!Array.isArray(repositoryIds) || repositoryIds.length === 0) {
    return Response.json(
      { error: "repositoryIds must be a non-empty array." },
      { status: 400 }
    );
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from("analysis_jobs")
    .insert({
      user_id: user.id,
      status: "running",
    })
    .select("*")
    .single();

  if (jobError) {
    return Response.json({ error: jobError.message }, { status: 500 });
  }

  try {
    const { data: repositories, error: repoError } = await supabaseAdmin
      .from("repositories")
      .select("*")
      .eq("user_id", user.id)
      .in("id", repositoryIds);

    if (repoError) {
      throw new Error(repoError.message);
    }

    if (!repositories || repositories.length === 0) {
      throw new Error("No repositories found.");
    }

    const snapshotResults = [];

    for (const repo of repositories) {
      const commits = await fetchRepoCommits(user.githubToken, repo.full_name);
      const languages = await fetchRepoLanguages(user.githubToken, repo.full_name);

      const snapshot = analyzeRepository({
        repoName: repo.name,
        commits,
        languages,
      });

      snapshotResults.push(snapshot);

      const { error: snapshotError } = await supabaseAdmin
        .from("repository_snapshots")
        .insert({
          job_id: job.id,
          repository_id: repo.id,
          commit_count: snapshot.commitCount,
          active_days: snapshot.activeDays,
          active_weeks: snapshot.activeWeeks,
          first_commit_at: snapshot.firstCommitAt,
          last_commit_at: snapshot.lastCommitAt,
          languages: snapshot.languages,
          commit_type_counts: snapshot.commitTypeCounts,
        });

      if (snapshotError) {
        throw new Error(snapshotError.message);
      }
    }

    const report = generateDeveloperReport(snapshotResults);

    const { data: savedReport, error: reportError } = await supabaseAdmin
      .from("developer_reports")
      .insert({
        job_id: job.id,
        user_id: user.id,
        developer_type: report.developerType,
        scores: report.scores,
        summary: report.summary,
        strengths: report.strengths,
        recommendations: report.recommendations,
      })
      .select("*")
      .single();

    if (reportError) {
      throw new Error(reportError.message);
    }

    await supabaseAdmin
      .from("analysis_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return Response.json({
      jobId: job.id,
      reportId: savedReport.id,
      report,
    });
  } catch (error) {
    await supabaseAdmin
      .from("analysis_jobs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", job.id);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}