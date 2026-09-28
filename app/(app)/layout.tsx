import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { BottomTabBar, DesktopNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <Link href="/today" className="font-semibold">
            on-the-run
          </Link>
          <DesktopNav />
        </div>
        <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
          <Link
            href="/panduan"
            className="hidden text-xs underline-offset-4 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100 md:inline"
          >
            Panduan
          </Link>
          <span className="hidden truncate text-xs sm:inline">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>
      <BottomTabBar />
    </div>
  );
}
