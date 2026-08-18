"use client";

import { useState } from "react";

import { changePassword } from "@/app/actions/change-password";

export default function ChangePasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const result = await changePassword(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.success) {
      setMessage(result.success);
      event.currentTarget.reset();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4"
    >
      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Current Password
        </label>

        <input
          type="password"
          name="current_password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">
          New Password
        </label>

        <input
          type="password"
          name="new_password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
        />

        <p className="mt-2 text-xs text-slate-600">
          Minimum 8 characters.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Confirm New Password
        </label>

        <input
          type="password"
          name="confirm_password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Changing Password..." : "Change Password"}
      </button>
    </form>
  );
}