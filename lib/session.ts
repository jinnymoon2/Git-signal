import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabaseAdmin";
import { env } from "./env";
import { decryptText, encryptText } from "./crypto";

export type CurrentUser = {
  id: string;
  githubId: number;
  githubUsername: string;
  avatarUrl: string | null;
  githubToken: string;
};

export async function createSession(input: {
  userId: string;
  githubToken: string;
}) {
  const encryptedGithubToken = encryptText(input.githubToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .insert({
      user_id: input.userId,
      encrypted_github_token: encryptedGithubToken,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const cookieStore = await cookies();

  cookieStore.set(env.sessionCookieName, data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return data.id;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(env.sessionCookieName)?.value;

  if (!sessionId) {
    return null;
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("user_sessions")
    .select(
      `
      id,
      encrypted_github_token,
      expires_at,
      app_users (
        id,
        github_id,
        github_username,
        avatar_url
      )
    `
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return null;
  }

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return null;
  }

  const user = Array.isArray(session.app_users)
    ? session.app_users[0]
    : session.app_users;

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    githubId: user.github_id,
    githubUsername: user.github_username,
    avatarUrl: user.avatar_url,
    githubToken: decryptText(session.encrypted_github_token),
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(env.sessionCookieName)?.value;

  if (sessionId) {
    await supabaseAdmin.from("user_sessions").delete().eq("id", sessionId);
  }

  cookieStore.delete(env.sessionCookieName);
}
