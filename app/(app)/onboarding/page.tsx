export const metadata = { title: "Setup awal · on-the-run" };

export default function OnboardingPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Setup awal</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Timezone, satuan, dan zona HR akan disimpan di sini setelah tabel <code>profiles</code>
          dan <code>athlete_metrics_history</code> ada (M1).
        </p>
      </header>
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
        <li>Timezone (default Asia/Jakarta)</li>
        <li>Satuan (metric / imperial)</li>
        <li>Zona HR awal (opsional)</li>
      </ul>
    </section>
  );
}
