"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSignIn = () => {
    setError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const redirectTo = new URL("/auth/callback", site);
      if (next) redirectTo.searchParams.set("next", next);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (error) setError(error.message);
    });
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onSignIn}
        disabled={isPending}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        {isPending ? "Mengarahkan…" : "Masuk dengan Google"}
      </button>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
