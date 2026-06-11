import { getCurrentUser } from "@/lib/session";
import { fetchGitHubRepos } from "@/lib/github";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: savedRepos, error } = await supabaseAdmin
    .from("repositories")
    .select("*")
    .eq("user_id", user.id)
    .order("github_updated_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ repositories: savedRepos });
}

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const githubRepos = await fetchGitHubRepos(user.githubToken);

    const rows = githubRepos.map((repo) => ({
      user_id: user.id,
      github_repo_id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      primary_language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      is_private: repo.private,
      github_created_at: repo.created_at,
      github_updated_at: repo.updated_at,
    }));

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from("repositories")
        .upsert(rows, {
          onConflict: "user_id,github_repo_id",
        });

      if (error) {
        throw new Error(error.message);
      }
    }

    return Response.json({
      synced: rows.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}