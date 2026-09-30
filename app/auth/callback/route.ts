import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/today";

  if (!code) {
    const target = new URL("/login", url);
    target.searchParams.set("error", "missing_code");
    return NextResponse.redirect(target);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const target = new URL("/login", url);
    target.searchParams.set("error", error.message);
    return NextResponse.redirect(target);
  }

  const user = data.user;
  if (user) {
    const meta = user.user_metadata ?? {};
    const displayName =
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      null;
    await db
      .insert(profiles)
      .values({ userId: user.id, displayName })
      .onConflictDoNothing({ target: profiles.userId });
  }

  return NextResponse.redirect(new URL(next, url));
}
