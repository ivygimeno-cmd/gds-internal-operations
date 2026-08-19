"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/actions/logout";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: string;
  profile_picture_url: string | null;
};

type Props = {
  profile: Profile;
  activePage:
    | "dashboard"
    | "register"
    | "leads"
    | "commission"
    | "announcements"
    | "message-admin";
};

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/bde/dashboard",
  },
  {
    key: "register",
    label: "Register Client",
    href: "/bde/register",
  },
  {
    key: "leads",
    label: "My Leads",
    href: "/bde/leads",
  },
  {
    key: "commission",
    label: "My Commission",
    href: "/bde/commission",
  },
  {
    key: "announcements",
    label: "Announcements",
    href: "/bde/announcements",
  },
  {
    key: "message-admin",
    label: "Message Admin",
    href: "/bde/message-admin",
  },
] as const;

export default function BdeSidebar({
  profile,
  activePage,
}: Props) {
  const [open, setOpen] = useState(false);

  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* ====================================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ====================================================== */}

      <aside className="hidden min-h-screen w-[285px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6 md:flex">

        {/* LOGO */}

        <Link href="/bde/dashboard">
          <img
            src="/gds-logo.png"
            alt="Gimeno Design Solutions"
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* NAVIGATION */}

        <div className="mt-8">

          <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <nav className="mt-3 space-y-1">

            {navItems.map((item) => {
              const active =
                item.key === activePage;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

          </nav>

        </div>

        {/* ACCOUNT */}

        <div className="mt-auto border-t border-white/10 pt-5">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">

            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.full_name}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-slate-400">
                {initials}
              </div>
            )}

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold text-white">
                {profile.full_name}
              </p>

              <p className="mt-1 truncate text-xs text-slate-500">
                {profile.username}
              </p>

            </div>

          </div>

          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Sign Out
            </button>
          </form>

        </div>

      </aside>

      {/* ====================================================== */}
      {/* MOBILE TOP BAR */}
      {/* EXACTLY: LOGO + BURGER */}
      {/* ====================================================== */}

      <header className="flex h-[82px] shrink-0 items-center justify-between border-b border-white/10 bg-[#07111f] px-5 md:hidden">

        <Link
          href="/bde/dashboard"
          className="shrink-0"
        >
          <img
            src="/gds-logo.png"
            alt="Gimeno Design Solutions"
            className="h-10 w-auto object-contain"
          />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>

      </header>

      {/* ====================================================== */}
      {/* MOBILE MENU */}
      {/* ====================================================== */}

      {open && (
        <div className="fixed inset-0 z-[100] md:hidden">

          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* MENU PANEL */}

          <aside className="absolute right-0 top-0 flex h-full w-[285px] max-w-[85vw] flex-col border-l border-white/10 bg-[#07111f] px-5 py-5 shadow-2xl">

            {/* MENU HEADER */}

            <div className="flex items-center justify-between">

              <Link
                href="/bde/dashboard"
                onClick={() => setOpen(false)}
              >
                <img
                  src="/gds-logo.png"
                  alt="Gimeno Design Solutions"
                  className="h-10 w-auto object-contain"
                />
              </Link>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>

            </div>

            {/* USER */}

            <div className="mt-7 border-b border-white/10 pb-5">

              <div className="flex items-center gap-3">

                {profile.profile_picture_url ? (
                  <img
                    src={profile.profile_picture_url}
                    alt={profile.full_name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-slate-400">
                    {initials}
                  </div>
                )}

                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold text-white">
                    {profile.full_name}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {profile.username}
                  </p>

                </div>

              </div>

            </div>

            {/* MOBILE NAVIGATION */}

            <div className="mt-5">

              <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </p>

              <nav className="mt-3 space-y-1">

                {navItems.map((item) => {
                  const active =
                    item.key === activePage;

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`block rounded-xl px-3 py-3 text-sm transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}

              </nav>

            </div>

            {/* SIGN OUT */}

            <div className="mt-auto border-t border-white/10 pt-5">

              <form action={logout}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Sign Out
                </button>
              </form>

            </div>

          </aside>

        </div>
      )}

    </>
  );
}