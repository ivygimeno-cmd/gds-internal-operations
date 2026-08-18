import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/actions/logout";
import RealtimeRefresh from "@/components/realtime-refresh";

function money(value: number | string | null) {
  const amount = Number(value || 0);

  return `${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} php`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    paid: "Paid",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400",
    approved: "bg-blue-500/10 text-blue-400",
    paid: "bg-green-500/10 text-green-400",
    cancelled: "bg-slate-500/10 text-slate-500",
  };

  return classes[status] ?? "bg-white/5 text-slate-400";
}

export default async function CommissionPage() {
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
      profile_picture_url
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    !["bde", "staff", "admin"].includes(profile.role)
  ) {
    redirect("/");
  }

  let query = admin
    .from("commissions")
    .select(`
      id,
      user_id,
      work_queue_id,
      client_name,
      project_name,
      project_amount,
      commission_rate,
      commission_amount,
      status,
      notes,
      approved_at,
      paid_at,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (profile.role !== "admin") {
    query = query.eq("user_id", user.id);
  }

  const { data: commissions } = await query;

  const rows = commissions ?? [];

  const pendingTotal = rows
    .filter((row) => row.status === "pending")
    .reduce(
      (sum, row) =>
        sum + Number(row.commission_amount || 0),
      0
    );

  const approvedTotal = rows
    .filter((row) => row.status === "approved")
    .reduce(
      (sum, row) =>
        sum + Number(row.commission_amount || 0),
      0
    );

  const paidTotal = rows
    .filter((row) => row.status === "paid")
    .reduce(
      (sum, row) =>
        sum + Number(row.commission_amount || 0),
      0
    );

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="flex min-h-screen w-[285px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6">
          <Link href="/bde/dashboard">
            <img
              src="/gds-logo.png"
              alt="Gimeno Design Solutions"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <div className="mt-8">
            <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>

            <nav className="mt-3 space-y-1">
              <Link
                href="/bde/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/bde/register"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Register Client
              </Link>

              <Link
                href="/bde/leads"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                My Leads
              </Link>

              <Link
                href="/bde/commission"
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
              >
                My Commission
              </Link>

          

              <Link
                href="/bde/announcements"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Announcements
              </Link>
            </nav>

            <div className="mt-7">
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-[11px] text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Message Admin
              </button>
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt={profile.full_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400">
                  {profile.full_name
                    .split(" ")
                    .map((part: string) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {profile.full_name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {profile.username}
                </p>
              </div>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {/* MAIN */}
        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-white/10 px-8 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                GDS Internal Operations
              </p>

              <h1 className="mt-2 text-2xl font-semibold">
                My Commission
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Track pending, approved and paid commissions.
              </p>
            </div>

            <Link
              href="/bde/dashboard"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Back to Dashboard
            </Link>
          </header>

          <div className="p-8">
            {/* TOTALS */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Pending
                </p>

                <p className="mt-3 text-2xl font-semibold text-amber-400">
                  {money(pendingTotal)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Approved
                </p>

                <p className="mt-3 text-2xl font-semibold text-blue-400">
                  {money(approvedTotal)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Paid
                </p>

                <p className="mt-3 text-2xl font-semibold text-green-400">
                  {money(paidTotal)}
                </p>
              </div>
            </div>

            {/* COMMISSIONS */}
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-lg font-semibold">
                  Commission History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {rows.length} record(s)
                </p>
              </div>

              <div className="p-5">
                {rows.length === 0 ? (
                  <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-white/10">
                    <div className="text-center">
                      <p className="text-sm text-slate-500">
                        No commission records yet.
                      </p>

                      <p className="mt-2 text-xs text-slate-600">
                        Approved client referrals will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rows.map((commission) => (
                      <div
                        key={commission.id}
                        className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">
                              {commission.client_name}
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {commission.project_name}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                              commission.status
                            )}`}
                          >
                            {statusLabel(
                              commission.status
                            )}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-600">
                              Project Amount
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {money(
                                commission.project_amount
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-600">
                              Rate
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {Number(
                                commission.commission_rate ||
                                  0
                              )}
                              %
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-600">
                              Commission
                            </p>

                            <p className="mt-1 text-sm font-semibold text-green-400">
                              {money(
                                commission.commission_amount
                              )}
                            </p>
                          </div>
                        </div>

                        {commission.notes && (
                          <p className="mt-4 text-sm leading-6 text-slate-500">
                            {commission.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}