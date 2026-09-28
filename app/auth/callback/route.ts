import { NextResponse, type NextRequest } from "next/server";
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
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const target = new URL("/login", url);
    target.searchParams.set("error", error.message);
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(next, url));
}
