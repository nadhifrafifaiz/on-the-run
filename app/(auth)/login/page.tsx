import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk · on-the-run" };

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">on-the-run</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Perencana dan catatan latihan multi-sport.
        </p>
      </header>
      <LoginForm next={next} />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          Gagal masuk: {error}
        </p>
      ) : null}
    </main>
  );
}
