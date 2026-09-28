// Reusable empty state — dashed border box with muted text + optional CTA.
// Standardize copy: use "Belum ada X" pattern (not "Kosong" / "(kosong)").
export function EmptyState({
  title,
  hint,
  cta,
  size = "md",
}: {
  title: string;
  hint?: string;
  cta?: React.ReactNode;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "p-3 text-xs" : "p-6 text-sm";
  return (
    <div
      className={`rounded-lg border border-dashed border-zinc-300 text-center text-zinc-500 dark:border-zinc-700 ${pad}`}
    >
      <p>{title}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
      {cta ? <div className="mt-3">{cta}</div> : null}
    </div>
  );
}
