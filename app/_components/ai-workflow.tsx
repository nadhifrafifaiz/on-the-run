"use client";

import { useState } from "react";

type Step = { title: string; body: string };

type Props = {
  steps: Step[];
  prompt: string;
  promptLabel?: string;
};

// Small reusable stepper for "use your own AI" workflows.
// Shows 3-4 steps + a copy-prompt button. Zero heavy UI on purpose —
// this is a memory aid, not a wizard.
export function AiWorkflowStepper({ steps, prompt, promptLabel = "Copy prompt" }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">Pakai AI di luar app</h3>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {copied ? "✓ Tersalin" : promptLabel}
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.title}</p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
