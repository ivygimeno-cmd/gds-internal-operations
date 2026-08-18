import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/actions/logout";
import RealtimeRefresh from "@/components/realtime-refresh";

function money(value: number | string | null) {
  const amount = Number(value || 0);

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    in_progress: "In Progress",
    waiting_client: "Waiting for Client",
    revision: "Revision",
    testing: "Testing",
    completed: "Completed",
  };

  return labels[status || ""] ?? status ?? "Active";
}

function statusClass(status: string | null) {
  const classes: Record<string, string> = {
    in_progress: "bg-blue-500/10 text-blue-400",
    waiting_client: "bg-amber-500/10 text-amber-400",
    revision: "bg-violet-500/10 text-violet-400",
    testing: "bg-cyan-500/10 text-cyan-400",
    completed: "bg-green-500/10 text-green-400",
  };

  return classes[status || ""] ?? "bg-white/5 text-slate-400";
}

function commissionStatusClass(status: string) {
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

  /*
   * CURRENT PROJECTS
   *
   * These are projects currently claimed by the logged-in BDE.
   * Completed projects are removed from the current section,
   * but their commission records remain in Commission History.
   */
 const { data: projectData, error: projectError } = await admin
  .from("work_queue")
  .select(`
    id,
    client_name,
    business_name,
    project_name,
    service_type,
    status,
    project_status,
    claimed_at,
    created_at
  `)
  .eq("claimed_by", user.id)
  .eq("status", "claimed")
  .order("claimed_at", {
    ascending: false,
  });

if (projectError) {
  console.error(
    "BDE Commission - failed to load projects:",
    projectError
  );
}


  const currentProjects = (projectData ?? []).filter(
    (project) => project.project_status !== "completed"
  );
  console.log(
  "BDE Commission - projectData:",
  projectData
);

  const currentProjectIds = new Set(
    currentProjects.map((project) => project.id)
  );

  /*
   * COMMISSIONS
   *
   * We keep ALL commission records so paid records can remain
   * permanently visible in Commission History.
   */
  const { data: commissions } = await admin
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
      paid_amount,
      status,
      notes,
      approved_at,
      paid_at,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const rows = commissions ?? [];

  /*
   * CURRENT COMMISSION
   *
   * Only commissions connected to active projects are included
   * in the Pending / Approved / Paid totals.
   *
   * Once the project is completed, the commission remains in
   * history but no longer contributes to the current totals.
   */
 const currentCommissionRows = rows.filter((row) => {
  if (
    row.status === "cancelled" ||
    row.status === "paid"
  ) {
    return false;
  }

  if (!row.work_queue_id) {
    return true;
  }

  return currentProjectIds.has(row.work_queue_id);
});

 const approvedTotal = currentCommissionRows
  .reduce(
    (sum, row) =>
      sum + Number(row.commission_amount || 0),
    0
  );

const paidTotal = currentCommissionRows
  .reduce(
    (sum, row) =>
      sum + Number(row.paid_amount || 0),
    0
  );

const pendingTotal = currentCommissionRows
  .reduce(
    (sum, row) =>
      sum +
      Math.max(
        Number(row.commission_amount || 0) -
          Number(row.paid_amount || 0),
        0
      ),
    0
  );

  /*
   * HISTORY
   *
   * Only paid commissions are shown here.
   * These records remain even after the project is completed.
   */
  const paidHistory = rows.filter(
    (row) => row.status === "paid"
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
         <Link
  href="/bde/message-admin"
  className="block w-full rounded-xl bg-white/[0.03] px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/[0.06]"
>
  Message Admin
</Link>
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
                <p className="truncate text-sm font-semibold">
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
                {profile.full_name}
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
            {/* CURRENT PROJECTS */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-lg font-semibold">
                  Current Projects
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Active projects currently assigned to you.
                </p>
              </div>

              <div className="p-5">
                {currentProjects.length === 0 ? (
                  <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-white/10">
                    <p className="text-sm text-slate-600">
                      No active projects.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {currentProjects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-xl border border-white/10 bg-[#08111f] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {project.business_name ||
                                project.client_name}
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-300">
                              {project.project_name}
                            </p>

                            {project.service_type && (
                              <p className="mt-1 text-xs text-slate-500">
                                {project.service_type}
                              </p>
                            )}
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${statusClass(
                              project.project_status
                            )}`}
                          >
                            {statusLabel(
                              project.project_status
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* COMMISSION SUMMARY */}
            <section className="mt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Commission Summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Current commissions for your active projects.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">

  {/* APPROVED */}
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-sm font-medium text-slate-300">
      Approved
    </p>

    <p className="mt-3 text-3xl font-semibold text-blue-400">
      {money(approvedTotal)}
    </p>

    <p className="mt-3 text-xs leading-5 text-slate-500">
      Total approved commission.
    </p>
  </div>

  {/* PENDING */}
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-sm font-medium text-slate-300">
      Pending
    </p>

    <p className="mt-3 text-3xl font-semibold text-amber-400">
      {money(pendingTotal)}
    </p>

    <p className="mt-3 text-xs leading-5 text-slate-500">
      Commission not yet released.
    </p>
  </div>

  {/* PAID */}
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-sm font-medium text-slate-300">
      Paid
    </p>

    <p className="mt-3 text-3xl font-semibold text-green-400">
      {money(paidTotal)}
    </p>

    <p className="mt-3 text-xs leading-5 text-slate-500">
      Commission released by GDS.
    </p>
  </div>

</div>
            </section>

            {/* COMMISSION HISTORY */}
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-lg font-semibold">
                  Commission History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your completed commission payments.
                </p>
              </div>

              <div className="p-5">
                {paidHistory.length === 0 ? (
                  <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10">
                    <div className="text-center">
                      <p className="text-sm text-slate-500">
                        No paid commissions yet.
                      </p>

                      <p className="mt-2 text-xs text-slate-600">
                        Paid commissions will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paidHistory.map((commission) => (
                      <div
                        key={commission.id}
                        className="rounded-xl border border-white/10 bg-[#08111f] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {commission.project_name}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {commission.client_name}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-400">
                              {money(
                                commission.commission_amount
                              )}
                            </p>

                            <span className="mt-1 inline-flex rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-medium text-green-400">
                              Paid
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-white/10 pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">
                              {commission.paid_at
                                ? `Paid ${new Date(
                                    commission.paid_at
                                  ).toLocaleDateString(
                                    "en-PH",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}`
                                : "Paid"}
                            </p>

                            {commission.notes && (
                              <p className="max-w-[70%] text-xs text-slate-600">
                                {commission.notes}
                              </p>
                            )}
                          </div>
                        </div>
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