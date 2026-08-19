import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BdeSidebar from "@/components/bde-sidebar";
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
      profile_picture_url,
      payment_method,
      payment_account_number,
      payment_account_name
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
   * ============================================================
   * COMMISSIONS
   * ============================================================
   */

  const { data: commissions, error: commissionError } =
    await admin
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

  if (commissionError) {
    console.error(
      "BDE Commission - failed to load commissions:",
      commissionError
    );
  }

  const rows = commissions ?? [];

  /*
   * ============================================================
   * ACTIVE COMMISSIONS
   * ============================================================
   */

  const activeCommissionRows = rows.filter((row) => {
    if (row.status === "cancelled") {
      return false;
    }

    const totalCommission =
      Number(row.commission_amount || 0);

    const paidAmount =
      Number(row.paid_amount || 0);

    return paidAmount < totalCommission;
  });

  /*
   * ============================================================
   * FULLY PAID HISTORY
   * ============================================================
   */

  const paidHistory = rows.filter((row) => {
    const totalCommission =
      Number(row.commission_amount || 0);

    const paidAmount =
      Number(row.paid_amount || 0);

    return (
      row.status === "paid" &&
      paidAmount >= totalCommission &&
      totalCommission > 0
    );
  });

  /*
   * ============================================================
   * ACTIVE PROJECTS
   * ============================================================
   */

  const activeWorkQueueIds = activeCommissionRows
    .map((row) => row.work_queue_id)
    .filter(Boolean);

  let currentProjects: {
    id: string;
    client_name: string | null;
    business_name: string | null;
    project_name: string | null;
    service_type: string | null;
    status: string | null;
    project_status: string | null;
    claimed_at: string | null;
    created_at: string;
  }[] = [];

  if (activeWorkQueueIds.length > 0) {
    const { data: projectData, error: projectError } =
      await admin
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
        .in("id", activeWorkQueueIds)
        .order("claimed_at", {
          ascending: false,
        });

    if (projectError) {
      console.error(
        "BDE Commission - failed to load projects:",
        projectError
      );
    }

    currentProjects = projectData ?? [];
  }

  /*
   * ============================================================
   * COMMISSION SUMMARY
   * ============================================================
   */

  const approvedTotal = activeCommissionRows.reduce(
    (sum, row) =>
      sum + Number(row.commission_amount || 0),
    0
  );

  const paidTotal = activeCommissionRows.reduce(
    (sum, row) =>
      sum + Number(row.paid_amount || 0),
    0
  );

  const pendingTotal = activeCommissionRows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        Number(row.commission_amount || 0) -
          Number(row.paid_amount || 0),
        0
      ),
    0
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="min-h-screen md:flex">

        {/* ====================================================== */}
        {/* SIDEBAR + MOBILE NAV */}
        {/* ====================================================== */}

        <BdeSidebar
          profile={profile}
          activePage="commission"
        />

        {/* ====================================================== */}
        {/* MAIN */}
        {/* ====================================================== */}

        <section className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 sm:text-xs">
                  GDS Internal Operations
                </p>

                <h1 className="mt-2 text-2xl font-semibold">
                  My Commission
                </h1>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {profile.full_name}
                </p>
              </div>

              <Link
                href="/bde/dashboard"
                className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm text-slate-300 transition hover:bg-white/5 hover:text-white sm:w-auto"
              >
                Back to Dashboard
              </Link>

            </div>
          </header>

          {/* CONTENT */}

          <div className="p-4 sm:p-6 lg:p-8">

            {/* ================================================== */}
            {/* CURRENT PROJECTS */}
            {/* ================================================== */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

              <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-semibold">
                  Current Projects
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Active projects currently assigned to you.
                </p>
              </div>

              <div className="p-4 sm:p-5">

                {currentProjects.length === 0 ? (

                  <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-white/10 px-5">
                    <p className="text-center text-sm text-slate-600">
                      No active projects.
                    </p>
                  </div>

                ) : (

                  <div className="grid gap-3 sm:grid-cols-2">

                    {currentProjects.map((project) => (

                      <div
                        key={project.id}
                        className="min-w-0 rounded-xl border border-white/10 bg-[#08111f] p-4 sm:p-5"
                      >

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                          <div className="min-w-0">

                            <p className="break-words text-sm font-semibold text-white">
                              {project.client_name ||
                                project.business_name}
                            </p>

                            <p className="mt-1 break-words text-sm text-slate-300">
                              {project.project_name}
                            </p>

                            {project.service_type && (
                              <p className="mt-1 break-words text-xs text-slate-500">
                                {project.service_type}
                              </p>
                            )}

                          </div>

                          <span
                            className={`self-start rounded-full px-2.5 py-1 text-[10px] font-medium ${statusClass(
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

            {/* ================================================== */}
            {/* COMMISSION SUMMARY */}
            {/* ================================================== */}

            <section className="mt-6">

              <div className="mb-4">

                <h2 className="text-lg font-semibold">
                  Commission Summary
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Current commissions for your active projects.
                </p>

              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* APPROVED */}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">

                  <p className="text-sm font-medium text-slate-300">
                    Approved
                  </p>

                  <p className="mt-3 break-words text-3xl font-semibold text-blue-400 sm:text-4xl">
                    {money(approvedTotal)}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Total approved commission.
                  </p>

                </div>

                {/* PENDING */}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">

                  <p className="text-sm font-medium text-slate-300">
                    Pending
                  </p>

                  <p className="mt-3 break-words text-3xl font-semibold text-amber-400 sm:text-4xl">
                    {money(pendingTotal)}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Commission not yet released.
                  </p>

                </div>

                {/* PAID */}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">

                  <p className="text-sm font-medium text-slate-300">
                    Paid
                  </p>

                  <p className="mt-3 break-words text-3xl font-semibold text-green-400 sm:text-4xl">
                    {money(paidTotal)}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Commission released by GDS.
                  </p>

                </div>

              </div>

            </section>

            {/* ================================================== */}
            {/* ACTIVE COMMISSIONS */}
            {/* ================================================== */}

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">

              <div className="border-b border-white/10 px-5 py-5 sm:px-6">

                <h2 className="text-lg font-semibold">
                  Active Commissions
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Commissions that are still being released.
                </p>

              </div>

              <div className="p-4 sm:p-5">

                {activeCommissionRows.length === 0 ? (

                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 px-5">

                    <div className="text-center">

                      <p className="text-sm text-slate-500">
                        No active commissions.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        New approved commissions will appear here.
                      </p>

                    </div>

                  </div>

                ) : (

                  <div className="space-y-3">

                    {activeCommissionRows.map((commission) => {

                      const total =
                        Number(
                          commission.commission_amount || 0
                        );

                      const paid =
                        Number(
                          commission.paid_amount || 0
                        );

                      const remaining =
                        Math.max(
                          total - paid,
                          0
                        );

                      return (

                        <div
                          key={commission.id}
                          className="min-w-0 rounded-xl border border-white/10 bg-[#08111f] p-4 sm:p-5"
                        >

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <p className="break-words text-sm font-semibold text-white">
                                {commission.project_name}
                              </p>

                              <p className="mt-1 break-words text-sm text-slate-400">
                                {commission.client_name}
                              </p>

                            </div>

                            <span className="self-start rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
                              Partially Paid
                            </span>

                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">

                              <p className="text-xs text-slate-500">
                                Total Commission
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold text-blue-400">
                                {money(total)}
                              </p>

                            </div>

                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">

                              <p className="text-xs text-slate-500">
                                Paid So Far
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold text-green-400">
                                {money(paid)}
                              </p>

                            </div>

                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:col-span-2 lg:col-span-1">

                              <p className="text-xs text-slate-500">
                                Remaining
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold text-amber-400">
                                {money(remaining)}
                              </p>

                            </div>

                          </div>

                          {commission.notes && (

                            <div className="mt-4 border-t border-white/10 pt-4">

                              <p className="break-words text-xs leading-5 text-slate-500">
                                {commission.notes}
                              </p>

                            </div>

                          )}

                        </div>

                      );
                    })}

                  </div>

                )}

              </div>

            </section>

            {/* ================================================== */}
            {/* COMMISSION HISTORY */}
            {/* ================================================== */}

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">

              <div className="border-b border-white/10 px-5 py-5 sm:px-6">

                <h2 className="text-lg font-semibold">
                  Commission History
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Your completed commission payments.
                </p>

              </div>

              <div className="p-4 sm:p-5">

                {paidHistory.length === 0 ? (

                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 px-5">

                    <div className="text-center">

                      <p className="text-sm text-slate-500">
                        No paid commissions yet.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Fully paid commissions will appear here.
                      </p>

                    </div>

                  </div>

                ) : (

                  <div className="space-y-3">

                    {paidHistory.map((commission) => (

                      <div
                        key={commission.id}
                        className="min-w-0 rounded-xl border border-white/10 bg-[#08111f] p-4 sm:p-5"
                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div className="min-w-0">

                            <p className="break-words text-sm font-semibold text-white">
                              {commission.project_name}
                            </p>

                            <p className="mt-1 break-words text-sm text-slate-400">
                              {commission.client_name}
                            </p>

                          </div>

                          <div className="text-left sm:text-right">

                            <p className="break-words text-sm font-semibold text-green-400">
                              {money(
                                commission.commission_amount
                              )}
                            </p>

                            <span className="mt-1 inline-flex rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-medium text-green-400">
                              Paid in Full
                            </span>

                          </div>

                        </div>

                        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">

                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">

                            <p className="text-xs text-slate-500">
                              Total Commission
                            </p>

                            <p className="mt-1 break-words text-sm text-slate-300">
                              {money(
                                commission.commission_amount
                              )}
                            </p>

                          </div>

                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">

                            <p className="text-xs text-slate-500">
                              Released
                            </p>

                            <p className="mt-1 break-words text-sm text-green-400">
                              {money(
                                commission.paid_amount
                              )}
                            </p>

                          </div>

                        </div>

                        <div className="mt-4 border-t border-white/10 pt-3">

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

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
                                : "Paid in full"}

                            </p>

                            {commission.notes && (
                              <p className="break-words text-xs leading-5 text-slate-600 sm:max-w-[70%] sm:text-right">
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