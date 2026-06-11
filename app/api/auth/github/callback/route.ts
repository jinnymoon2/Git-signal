import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForGitHubToken,
  fetchGitHubUser,
} from "@/lib/github";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSession } from "@/lib/session";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${env.appUrl}/?error=missing_code`);
  }

  try {
    const githubToken = await exchangeCodeForGitHubToken(code);
    const githubUser = await fetchGitHubUser(githubToken);

    const { data: existingUser } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("github_id", githubUser.id)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      await supabaseAdmin
        .from("app_users")
        .update({
          github_username: githubUser.login,
          avatar_url: githubUser.avatar_url,
        })
        .eq("id", userId);
    } else {
      const { data: newUser, error } = await supabaseAdmin
        .from("app_users")
        .insert({
          github_id: githubUser.id,
          github_username: githubUser.login,
          avatar_url: githubUser.avatar_url,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      userId = newUser.id;
    }

    await createSession({
      userId,
      githubToken,
    });

    return NextResponse.redirect(`${env.appUrl}/dashboard`);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${env.appUrl}/?error=github_auth_failed`);
  }
}