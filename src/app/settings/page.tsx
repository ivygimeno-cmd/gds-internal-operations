import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import ChangePasswordForm from "@/components/change-password-form";
import PaymentMethodForm from "@/components/payment-method-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select(`
      id,
      username,
      full_name,
      role,
      title,
      is_active,
      profile_picture_url,
      payment_method,
      payment_account_name,
      payment_account_number,
      payment_bank_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="text-sm text-slate-400 transition hover:text-white"
        >
          ← Back
        </Link>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
            GDS Internal Operations
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Account Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your account security, password, and payment details.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.full_name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-slate-400">
                {profile.full_name
                  .split(" ")
                  .map((part: string) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}

            <div>
              <p className="font-semibold">
                {profile.full_name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {profile.username}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wide text-blue-400">
                {profile.title || profile.role}
              </p>
            </div>
          </div>

          <div className="pt-6">
            <h2 className="text-lg font-semibold">
              Change Password
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Keep your account secure by using a strong password
              that you do not reuse elsewhere.
            </p>

            <ChangePasswordForm />
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <h2 className="text-lg font-semibold">
              Payment Method
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add your preferred payment account so commissions can
              be sent directly to you.
            </p>

            <PaymentMethodForm
              fullName={profile.full_name}
              paymentMethod={profile.payment_method}
              accountName={profile.payment_account_name}
              accountNumber={profile.payment_account_number}
              bankName={profile.payment_bank_name}
            />
          </div>
        </section>
      </div>
    </main>
  );
}