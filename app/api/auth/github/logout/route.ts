import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { env } from "@/lib/env";

export async function POST() {
  await destroySession();

  return NextResponse.redirect(env.appUrl);
}