import { env } from "./env";

export type GitHubUser = {
  id: number;
  login: string;
  avatar_url: string | null;
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  created_at: string;
  updated_at: string;
};

export type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
      name: string;
      email: string;
    };
  };
};

export async function exchangeCodeForGitHubToken(code: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub OAuth code.");
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("GitHub did not return an access token.");
  }

  return data.access_token;
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user.");
  }

  return response.json();
}

export async function fetchGitHubRepos(token: string): Promise<GitHubRepo[]> {
  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub repositories.");
  }

  return response.json();
}

export async function fetchRepoCommits(
  token: string,
  fullName: string
): Promise<GitHubCommit[]> {
  const response = await fetch(
    `https://api.github.com/repos/${fullName}/commits?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch commits for ${fullName}.`);
  }

  return response.json();
}

export async function fetchRepoLanguages(
  token: string,
  fullName: string
): Promise<Record<string, number>> {
  const response = await fetch(
    `https://api.github.com/repos/${fullName}/languages`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch languages for ${fullName}.`);
  }

  return response.json();
}
