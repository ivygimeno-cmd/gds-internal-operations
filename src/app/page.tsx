"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/login";

const initialState = {
  error: "",
};

export default function Home() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="min-h-screen bg-[#050b18] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <img
            src="/gds-logo.png"
            alt="Gimeno Design Solutions"
            className="mx-auto mb-6 h-20 w-auto object-contain"
          />

          <h1 className="text-xl font-semibold tracking-[0.22em]">
            INTERNAL OPERATIONS
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Secure access for GDS personnel
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl shadow-black/30">
          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your GDS username"
                autoComplete="username"
                required
                className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-400">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-center text-xs leading-5 text-slate-500">
              Account access is managed by GDS Administration.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}