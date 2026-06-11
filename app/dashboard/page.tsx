"use client";

import { useEffect, useState } from "react";

type Repository = {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  primary_language: string | null;
  stars: number;
  forks: number;
  github_updated_at: string;
};

type Report = {
  id: string;
  developer_type: string;
  scores: {
    agility: number;
    stability: number;
    contribution: number;
    adaptability: number;
    consistency: number;
  };
  summary: string;
  strengths: string[];
  recommendations: string[];
};

type User = {
  githubUsername: string;
  avatarUrl: string | null;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUser() {
    const response = await fetch("/api/me");

    if (!response.ok) {
      window.location.href = "/";
      return;
    }

    const data = await response.json();
    setUser(data.user);
  }

  async function loadRepositories() {
    const response = await fetch("/api/github/repos");

    if (!response.ok) return;

    const data = await response.json();
    setRepositories(data.repositories || []);
  }

  async function loadLatestReport() {
    const response = await fetch("/api/reports/latest");

    if (!response.ok) return;

    const data = await response.json();
    setReport(data.report);
  }

  async function syncRepositories() {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/github/repos", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sync repositories.");
      }

      await loadRepositories();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSyncing(false);
    }
  }

  async function startAnalysis() {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analysis/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryIds: selectedRepoIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze repositories.");
      }

      await loadLatestReport();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleRepo(repoId: string) {
    setSelectedRepoIds((current) => {
      if (current.includes(repoId)) {
        return current.filter((id) => id !== repoId);
      }

      return [...current, repoId];
    });
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await loadUser();
      await loadRepositories();
      await loadLatestReport();
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="section">
        <div className="container">
          <p>Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <header className="header">
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>GitSignal</strong>

          <form action="/api/auth/logout" method="post">
            <button className="button secondary" type="submit">
              Logout
            </button>
          </form>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <div className="card">
            <h1>Dashboard</h1>

            {user && (
              <p className="muted">
                Connected as <strong>{user.githubUsername}</strong>
              </p>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                className="button"
                onClick={syncRepositories}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync GitHub Repositories"}
              </button>

              <button
                className="button secondary"
                onClick={startAnalysis}
                disabled={analyzing || selectedRepoIds.length === 0}
              >
                {analyzing
                  ? "Analyzing..."
                  : `Analyze ${selectedRepoIds.length} Selected`}
              </button>
            </div>

            {error && (
              <p style={{ color: "#fca5a5", marginTop: 16 }}>{error}</p>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid two">
          <div className="card">
            <h2>Repositories</h2>
            <p className="muted">
              Select repositories to include in your developer profile.
            </p>

            {repositories.length === 0 && (
              <p className="muted">
                No repositories yet. Click “Sync GitHub Repositories.”
              </p>
            )}

            {repositories.map((repo) => (
              <label className="repo-row" key={repo.id}>
                <input
                  type="checkbox"
                  checked={selectedRepoIds.includes(repo.id)}
                  onChange={() => toggleRepo(repo.id)}
                />

                <div>
                  <strong>{repo.full_name}</strong>
                  <div className="muted">
                    {repo.primary_language || "Unknown language"} · ⭐{" "}
                    {repo.stars} · Forks {repo.forks}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="card">
            <h2>Latest Developer Report</h2>

            {!report && (
              <p className="muted">
                No report yet. Select repositories and run analysis.
              </p>
            )}

            {report && (
              <>
                <p className="muted">Developer Type</p>
                <h1>{report.developer_type}</h1>

                <p>{report.summary}</p>

                <h3>Scores</h3>

                {Object.entries(report.scores).map(([key, value]) => (
                  <div className="score-row" key={key}>
                    <div className="score-label">
                      <span>{key}</span>
                      <span>{value}/100</span>
                    </div>
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}

                <h3>Strengths</h3>
                <ul>
                  {report.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>

                <h3>Recommendations</h3>
                <ul>
                  {report.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
