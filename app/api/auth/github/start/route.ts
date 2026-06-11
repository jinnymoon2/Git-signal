import { NextResponse } from "next/server";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!appUrl) {
    return Response.json(
      { error: "Missing NEXT_PUBLIC_APP_URL" },
      { status: 500 }
    );
  }

  if (!clientId) {
    return Response.json(
      { error: "Missing GITHUB_CLIENT_ID" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/github/callback`,
    scope: "read:user public_repo",
  });

  const redirectUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(redirectUrl);
}
