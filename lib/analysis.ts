import { GitHubCommit } from "./github";

export type RepositorySnapshotInput = {
  repoName: string;
  commits: GitHubCommit[];
  languages: Record<string, number>;
};

export type RepositorySnapshotResult = {
  repoName: string;
  commitCount: number;
  activeDays: number;
  activeWeeks: number;
  firstCommitAt: string | null;
  lastCommitAt: string | null;
  languages: Record<string, number>;
  commitTypeCounts: Record<string, number>;
};

export type DeveloperScores = {
  agility: number;
  stability: number;
  contribution: number;
  adaptability: number;
  consistency: number;
};

export type DeveloperReportResult = {
  developerType: string;
  scores: DeveloperScores;
  summary: string;
  strengths: string[];
  recommendations: string[];
};

function getWeekKey(date: Date): string {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear =
    (date.getTime() - firstDayOfYear.getTime()) / 86400000;

  const weekNumber = Math.ceil(
    (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
  );

  return `${date.getFullYear()}-${weekNumber}`;
}

export function classifyCommitMessage(message: string): string {
  const lower = message.toLowerCase();

  if (lower.startsWith("feat") || lower.includes("add")) return "feature";
  if (lower.startsWith("fix") || lower.includes("bug")) return "fix";
  if (lower.startsWith("docs") || lower.includes("readme")) return "docs";
  if (lower.startsWith("refactor")) return "refactor";
  if (lower.startsWith("test")) return "test";
  if (lower.startsWith("chore")) return "chore";
  if (lower.includes("style") || lower.includes("css")) return "style";

  return "other";
}

export function analyzeRepository(
  input: RepositorySnapshotInput
): RepositorySnapshotResult {
  const commitDates = input.commits
    .map((commit) => new Date(commit.commit.author.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const activeDays = new Set(
    commitDates.map((date) => date.toISOString().slice(0, 10))
  ).size;

  const activeWeeks = new Set(commitDates.map(getWeekKey)).size;

  const commitTypeCounts: Record<string, number> = {};

  for (const commit of input.commits) {
    const type = classifyCommitMessage(commit.commit.message);
    commitTypeCounts[type] = (commitTypeCounts[type] || 0) + 1;
  }

  return {
    repoName: input.repoName,
    commitCount: input.commits.length,
    activeDays,
    activeWeeks,
    firstCommitAt: commitDates[0]?.toISOString() ?? null,
    lastCommitAt: commitDates[commitDates.length - 1]?.toISOString() ?? null,
    languages: input.languages,
    commitTypeCounts,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateRecentCommitRatio(
  snapshots: RepositorySnapshotResult[]
): number {
  const now = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);

  let recentRepos = 0;

  for (const snapshot of snapshots) {
    if (!snapshot.lastCommitAt) continue;

    const lastCommitDate = new Date(snapshot.lastCommitAt);

    if (lastCommitDate >= ninetyDaysAgo) {
      recentRepos += 1;
    }
  }

  if (snapshots.length === 0) return 0;

  return recentRepos / snapshots.length;
}

function calculateLanguageDiversity(
  snapshots: RepositorySnapshotResult[]
): number {
  const languages = new Set<string>();

  for (const snapshot of snapshots) {
    for (const language of Object.keys(snapshot.languages)) {
      languages.add(language);
    }
  }

  return languages.size;
}

function calculateMaintainedRepoRatio(
  snapshots: RepositorySnapshotResult[]
): number {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  let maintained = 0;

  for (const snapshot of snapshots) {
    if (!snapshot.lastCommitAt) continue;

    if (new Date(snapshot.lastCommitAt) >= sixMonthsAgo) {
      maintained += 1;
    }
  }

  if (snapshots.length === 0) return 0;

  return maintained / snapshots.length;
}

export function calculateScores(
  snapshots: RepositorySnapshotResult[]
): DeveloperScores {
  const totalCommits = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.commitCount,
    0
  );

  const totalActiveWeeks = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.activeWeeks,
    0
  );

  const repoCount = snapshots.length;
  const languageDiversity = calculateLanguageDiversity(snapshots);
  const recentCommitRatio = calculateRecentCommitRatio(snapshots);
  const maintainedRepoRatio = calculateMaintainedRepoRatio(snapshots);

  return {
    contribution: clampScore(Math.log10(totalCommits + 1) * 35),
    consistency: clampScore(totalActiveWeeks * 6),
    adaptability: clampScore(languageDiversity * 18 + repoCount * 5),
    agility: clampScore(recentCommitRatio * 80 + totalCommits * 0.3),
    stability: clampScore(maintainedRepoRatio * 70 + totalActiveWeeks * 2),
  };
}

export function classifyDeveloper(scores: DeveloperScores): string {
  if (scores.adaptability >= 75) return "Explorer";
  if (scores.agility >= 75 && scores.contribution >= 60) return "Sprinter";
  if (scores.stability >= 75 && scores.consistency >= 65) return "Keeper";
  if (scores.contribution >= 70 && scores.consistency >= 60) return "Builder";
  if (scores.stability >= 60 && scores.agility >= 50) return "Fixer";

  return "Builder";
}

export function generateSummary(
  developerType: string,
  scores: DeveloperScores
): string {
  const strongestMetric = Object.entries(scores).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  return `This developer profile is classified as ${developerType}. The strongest signal is ${strongestMetric}, based on repository activity, commit metadata, language distribution, and recent maintenance patterns.`;
}

export function generateStrengths(scores: DeveloperScores): string[] {
  const strengths: string[] = [];

  if (scores.contribution >= 60) {
    strengths.push("Shows meaningful implementation activity across repositories.");
  }

  if (scores.consistency >= 60) {
    strengths.push("Maintains a steady contribution rhythm over time.");
  }

  if (scores.adaptability >= 60) {
    strengths.push("Works across multiple technologies or repository contexts.");
  }

  if (scores.stability >= 60) {
    strengths.push("Demonstrates maintenance behavior and project continuity.");
  }

  if (scores.agility >= 60) {
    strengths.push("Shows recent activity and fast-moving development behavior.");
  }

  if (strengths.length === 0) {
    strengths.push("Has enough repository metadata to begin forming a developer profile.");
  }

  return strengths;
}

export function generateRecommendations(scores: DeveloperScores): string[] {
  const recommendations: string[] = [];

  if (scores.consistency < 50) {
    recommendations.push("Increase consistency by contributing in smaller, regular intervals.");
  }

  if (scores.adaptability < 50) {
    recommendations.push("Show more technical range by documenting or building with varied tools.");
  }

  if (scores.stability < 50) {
    recommendations.push("Keep projects maintained with README updates, bug fixes, and small improvements.");
  }

  if (scores.contribution < 50) {
    recommendations.push("Add more visible implementation work through commits and project updates.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Add project-level explanations to make the Git activity easier for recruiters to understand.");
  }

  return recommendations;
}

export function generateDeveloperReport(
  snapshots: RepositorySnapshotResult[]
): DeveloperReportResult {
  const scores = calculateScores(snapshots);
  const developerType = classifyDeveloper(scores);

  return {
    developerType,
    scores,
    summary: generateSummary(developerType, scores),
    strengths: generateStrengths(scores),
    recommendations: generateRecommendations(scores),
  };
}
