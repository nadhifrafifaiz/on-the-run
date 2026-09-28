"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toIsoDate, weekStartOf } from "@/lib/utils/dates";

const today = () => toIsoDate(new Date());

type Tab = { href: string; label: string; icon: React.ReactNode };

function tabs(): Tab[] {
  const monday = weekStartOf(today(), "monday");
  return [
    { href: "/today", label: "Hari ini", icon: <TodayIcon /> },
    { href: `/week/${monday}`, label: "Minggu", icon: <WeekIcon /> },
    { href: "/activities", label: "Aktivitas", icon: <ActivityIcon /> },
    { href: "/programs", label: "Program", icon: <ProgramIcon /> },
    { href: "/races", label: "Race", icon: <RaceIcon /> },
    { href: "/settings", label: "Setelan", icon: <SettingsIcon /> },
  ];
}

export function BottomTabBar() {
  const path = usePathname();
  const items = tabs();
  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden"
    >
      <ul className="grid grid-cols-6">
        {items.map((t) => {
          const active =
            (t.href === "/today" && path === "/today") ||
            (t.href.startsWith("/week/") && path.startsWith("/week/")) ||
            (t.href === "/activities" && path.startsWith("/activities")) ||
            (t.href === "/programs" && path.startsWith("/programs")) ||
            (t.href === "/races" && path.startsWith("/races")) ||
            (t.href === "/settings" && path.startsWith("/settings"));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium ${
                  active
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span className={active ? "" : "opacity-70"}>{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav() {
  const path = usePathname();
  const items = tabs();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((t) => {
        const active =
          (t.href === "/today" && path === "/today") ||
          (t.href.startsWith("/week/") && path.startsWith("/week/")) ||
          (t.href === "/activities" && path.startsWith("/activities")) ||
          (t.href === "/programs" && path.startsWith("/programs")) ||
          (t.href === "/settings" && path.startsWith("/settings"));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Minimal inline SVGs, no icon lib dependency.
function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M8 2v4M16 2v4M3 10h18" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  );
}
function WeekIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M3 10h18M9 4v18M15 4v18" strokeLinecap="round" />
    </svg>
  );
}
function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12h4l3-8 4 16 3-8h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ProgramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  );
}
function RaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 21V4l14 4-7 4 7 4-14 4z" strokeLinejoin="round" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.4l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .66.39 1.25 1 1.51.61.25 1.31.12 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82c.25.61.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.39-1.51 1z" />
    </svg>
  );
}
