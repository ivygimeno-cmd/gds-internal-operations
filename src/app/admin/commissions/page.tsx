import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { adminCreateCommission } from "@/app/actions/admin-create-commission";
import { adminSaveCommission } from "@/app/actions/admin-save-commission";
import { adminEditCommission } from "@/app/actions/admin-edit-commission";

import RealtimeRefresh from "@/components/realtime-refresh";
import CommissionProjectSelector from "@/components/commission-project-selector";

const COMMISSION_RATE = 15;

function money(value: number | string | null) {
  const amount = Number(value || 0);

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getCommissionStatus(
  commissionAmount: number,
  paidAmount: number,
  status: string
) {
  if (
    commissionAmount > 0 &&
    paidAmount >= commissionAmount
  ) {
    return "Fully Paid";
  }

  if (paidAmount > 0) {
    return "Partially Paid";
  }

  if (status === "approved") {
    return "Approved";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return "Pending";
}

export default async function AdminCommissionsPage() {
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
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    profile.role !== "admin"
  ) {
    redirect("/");
  }

   /*
   * ONLY CLAIMED PROJECTS
   *
   * Unclaimed projects do not appear.
   * Completed projects do not appear.
   */
  const { data: claimedProjects } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      submitted_by,
      status,
      project_status,
      claimed_at
    `)
    .eq("status", "claimed")
    .neq("project_status", "completed")
    .order("claimed_at", {
      ascending: false,
    });

  /*
   * ALL COMMISSION RECORDS
   *
   * Paid records remain in the database.
   * They are simply moved to History on the UI
   * once fully paid.
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
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  const rows = commissions ?? [];

  /*
   * FULLY PAID PROJECT IDS
   *
   * Once a commission is fully paid,
   * its project must disappear from
   * the Add Commission selector.
   */
  /*
 * CLAIMED PROJECTS AVAILABLE FOR NEW COMMISSIONS
 *
 * Once a project already has a commission,
 * it must disappear from Add Commission.
 *
 * This prevents creating duplicate commissions
 * for the same project.
 *
 * Cancelled commissions are excluded so a cancelled
 * commission can be created again if needed.
 */
const commissionedWorkQueueIds = new Set(
  rows
    .filter(
      (commission) =>
        commission.status !== "cancelled" &&
        commission.work_queue_id
    )
    .map(
      (commission) =>
        commission.work_queue_id
    )
);

const availableClaimedProjects = (
  claimedProjects ?? []
).filter(
  (project) =>
    !commissionedWorkQueueIds.has(project.id)
);
  /*
   * GET BDE / VA PROFILES
   *
   * We include both:
   * - owners of available projects
   * - owners of existing commissions
   *
   * This keeps old paid history showing the
   * correct BDE / VA name.
   */
  const submittedByIds = [
    ...new Set(
      [
        ...availableClaimedProjects.map(
          (project) =>
            project.submitted_by
        ),
        ...rows.map(
          (commission) =>
            commission.user_id
        ),
      ].filter(Boolean)
    ),
  ];

  const { data: registeredProfiles } =
    submittedByIds.length > 0
      ? await admin
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            role,
            title,
            payment_method,
            payment_account_name,
            payment_account_number,
            payment_bank_name
          `)
          .in(
            "id",
            submittedByIds
          )
      : { data: [] };

  /*
   * PROFILE LOOKUP
   */
  const registeredProfileMap =
    new Map(
      (registeredProfiles ?? []).map(
        (person) => [
          person.id,
          person,
        ]
      )
    );

  /*
   * PROJECT OPTIONS
   *
   * These are passed into the
   * CommissionProjectSelector component.
   */
  const projectOptions =
    availableClaimedProjects.map(
      (project) => ({
        id: project.id,
        client_name:
          project.client_name,
        business_name:
          project.business_name,
        project_name:
          project.project_name,
        submitted_by:
          project.submitted_by,
        registered_by_name:
          project.submitted_by
            ? registeredProfileMap.get(
                project.submitted_by
              )?.full_name ?? null
            : null,
      })
    );

  /*
   * ACTIVE COMMISSIONS
   *
   * Anything that still has money remaining
   * stays in Commission Records.
   */
  const activeCommissions = rows.filter(
    (commission) => {
      const total = Number(
        commission.commission_amount || 0
      );

      const paid = Number(
        commission.paid_amount || 0
      );

      return (
        commission.status !== "cancelled" &&
        paid < total
      );
    }
  );

  /*
   * HISTORY
   *
   * Once the commission is completely paid,
   * it disappears from the active list and
   * appears here instead.
   */
  const paidHistory = rows.filter(
    (commission) => {
      const total = Number(
        commission.commission_amount || 0
      );

      const paid = Number(
        commission.paid_amount || 0
      );

      return (
        total > 0 &&
        paid >= total
      );
    }
  );

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <RealtimeRefresh />

      <header className="flex items-center justify-between border-b border-white/10 px-8 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
            GDS Internal Operations
          </p>

          <h1 className="mt-2 text-2xl font-semibold">
            Commission Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage BDE/VA commissions.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
        >
          Back to Dashboard
        </Link>
      </header>

      <div className="grid gap-6 p-8 xl:grid-cols-[380px_1fr]">

        {/* =====================================================
            CREATE COMMISSION
        ===================================================== */}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">
            Add Commission
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select a claimed project to create its commission.
          </p>

          <form
            action={adminCreateCommission}
            className="mt-6 space-y-4"
          >
            {/* PROJECT SELECTOR */}
            <CommissionProjectSelector
              projects={projectOptions}
            />
            {availableClaimedProjects.length === 0 && (
  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3">
    <p className="text-xs text-slate-500">
      No claimed projects are available for a new commission.
    </p>

    <p className="mt-1 text-xs text-slate-600">
      Projects with existing commissions cannot be created again.
    </p>
  </div>
)}

            {/* PROJECT AMOUNT */}
            <div>
              <label className="mb-2 block text-xs text-slate-500">
                Project Amount
              </label>

              <input
                name="project_amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Project amount"
                className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white placeholder:text-slate-600"
              />
            </div>

            {/* FIXED COMMISSION RATE */}
            <div className="rounded-xl border border-white/10 bg-[#08111f] px-4 py-3">
              <p className="text-xs text-slate-500">
                Commission Rate
              </p>

              <p className="mt-1 text-sm font-semibold text-blue-400">
                {COMMISSION_RATE}%
              </p>
            </div>

            {/* COMMISSION CALCULATION */}
            <div className="rounded-xl border border-white/10 bg-[#08111f] px-4 py-3">
              <p className="text-xs text-slate-500">
                Commission
              </p>

              <p className="mt-1 text-sm font-semibold text-green-400">
                Automatically calculated at {COMMISSION_RATE}%
              </p>
            </div>

            {/* NOTES */}
            <textarea
              name="notes"
              rows={3}
              placeholder="Optional notes"
              className="w-full resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white placeholder:text-slate-600"
            />

            <button
  type="submit"
  disabled={availableClaimedProjects.length === 0}
  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
    availableClaimedProjects.length === 0
      ? "cursor-not-allowed bg-slate-800 text-slate-500"
      : "bg-blue-600 text-white hover:bg-blue-500"
  }`}
>
  {availableClaimedProjects.length === 0
    ? "No Projects Available"
    : "Create Commission"}
</button>
          </form>
        </section>


        {/* =====================================================
            ACTIVE COMMISSION RECORDS
        ===================================================== */}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Commission Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {activeCommissions.length} active commission(s)
            </p>
          </div>

          <div className="max-h-[760px] overflow-y-auto p-5">
            {activeCommissions.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10">
                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    No active commission records.
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    Fully paid commissions are moved to history.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">

                {activeCommissions.map((commission) => {
                  const totalCommission = Number(
                    commission.commission_amount || 0
                  );

                  const paidAmount = Number(
                    commission.paid_amount || 0
                  );

                  const remaining = Math.max(
                    totalCommission - paidAmount,
                    0
                  );

                  const isPartiallyPaid =
                    paidAmount > 0 &&
                    paidAmount < totalCommission;

                  /*
                   * IMPORTANT:
                   * user_id is the BDE/VA assigned to
                   * the commission.
                   */
                  const owner = (
                    registeredProfiles ?? []
                  ).find(
                    (person) =>
                      person.id === commission.user_id
                  );

                  const displayStatus =
                    getCommissionStatus(
                      totalCommission,
                      paidAmount,
                      commission.status
                    );

                  return (
                    <details
                      key={commission.id}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#08111f]"
                    >

                      {/* COLLAPSED ROW */}
                      <summary className="cursor-pointer list-none px-5 py-4">
                        <div className="flex items-center justify-between gap-4">

                          <div className="min-w-0">
                            <p className="font-semibold text-white">
                              {commission.project_name}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {commission.client_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {owner?.full_name ||
                                "Unknown BDE / VA"}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">

                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                isPartiallyPaid
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-blue-500/10 text-blue-400"
                              }`}
                            >
                              {displayStatus}
                            </span>

                            <span className="text-xs text-slate-500 transition-transform group-open:rotate-180">
                              ▼
                            </span>

                          </div>
                        </div>

                        <p className="mt-2 text-xs text-slate-600">
                          Click to view details
                        </p>
                      </summary>


                      {/* EXPANDED DETAILS */}
                      <div className="border-t border-white/10 p-5">

                      {/* EDIT COMMISSION */}
<form
  action={adminEditCommission}
  className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-4"
>
  <input
    type="hidden"
    name="commission_id"
    value={commission.id}
  />

  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-white">
        Edit Commission
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Update the project amount or correct the commission.
        The current paid amount will be preserved.
      </p>
    </div>
  </div>

  <div className="mt-4 grid gap-4 sm:grid-cols-2">
    <div>
      <label className="mb-2 block text-xs text-slate-500">
        Project Amount
      </label>

      <input
        name="project_amount"
        type="number"
        min="0"
        step="0.01"
        required
        defaultValue={commission.project_amount}
        className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
      />
    </div>

    <div>
      <label className="mb-2 block text-xs text-slate-500">
        Commission Rate
      </label>

      <div className="flex h-[46px] items-center rounded-xl border border-white/10 bg-[#050b18] px-4">
        <span className="text-sm font-semibold text-blue-400">
          {COMMISSION_RATE}%
        </span>
      </div>
    </div>
  </div>

  <div className="mt-4">
    <label className="mb-2 block text-xs text-slate-500">
      Notes
    </label>

    <textarea
      name="notes"
      rows={2}
      defaultValue={commission.notes ?? ""}
      placeholder="Optional notes"
      className="w-full resize-none rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500"
    />
  </div>

  <button
    type="submit"
    className="mt-4 w-full rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3 text-sm font-semibold text-blue-400 transition hover:bg-blue-600 hover:text-white"
  >
    Save Commission Changes
  </button>
</form>

                        <form
                          action={adminSaveCommission}
                          className="space-y-4"
                        >

                          <input
                            type="hidden"
                            name="commission_id"
                            value={commission.id}
                          />

                          <input
                            type="hidden"
                            name="project_amount"
                            value={commission.project_amount}
                          />

                          <input
                            type="hidden"
                            name="commission_rate"
                            value={COMMISSION_RATE}
                          />

                          {/* PROJECT / BDE INFO */}
                          <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">

                            <p className="text-xs text-slate-500">
                              Client
                            </p>

                            <p className="mt-1 font-semibold text-white">
                              {commission.client_name}
                            </p>

                            <p className="mt-4 text-xs text-slate-500">
                              Project
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {commission.project_name}
                            </p>

                            <p className="mt-4 text-xs text-slate-500">
                              Registered / Assigned BDE
                            </p>

                            <p className="mt-1 text-sm text-blue-400">
                              {owner?.full_name ||
                                "Unknown BDE / VA"}
                            </p>
{owner?.payment_method &&
  owner?.payment_account_number && (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-xs text-slate-500">
        Payment Method
      </p>

      <p className="mt-1 text-sm font-semibold text-green-400">
        {owner.payment_method === "gcash"
          ? "GCash"
          : owner.payment_method === "maya"
          ? "Maya"
          : owner.payment_bank_name || "Bank Account"}
        {" • "}
        {owner.payment_account_number}
      </p>

      {owner.payment_account_name && (
        <p className="mt-1 text-xs text-slate-500">
          Account Name:{" "}
          <span className="text-slate-400">
            {owner.payment_account_name}
          </span>
        </p>
      )}
    </div>
  )}
                          </div>


                          {/* FINANCIAL SUMMARY */}
                          <div className="grid gap-4 sm:grid-cols-3">

                            <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                              <p className="text-xs text-slate-500">
                                Total Commission
                              </p>

                              <p className="mt-2 text-lg font-semibold text-blue-400">
                                {money(totalCommission)}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                              <p className="text-xs text-slate-500">
                                Paid So Far
                              </p>

                              <p className="mt-2 text-lg font-semibold text-green-400">
                                {money(paidAmount)}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                              <p className="text-xs text-slate-500">
                                Remaining
                              </p>

                              <p className="mt-2 text-lg font-semibold text-amber-400">
                                {money(remaining)}
                              </p>
                            </div>

                          </div>


                          {/* PROJECT AMOUNT + RATE */}
                          <div className="grid gap-4 sm:grid-cols-2">

                            <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                              <p className="text-xs text-slate-500">
                                Project Amount
                              </p>

                              <p className="mt-2 font-semibold text-white">
                                {money(
                                  commission.project_amount
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                              <p className="text-xs text-slate-500">
                                Commission Rate
                              </p>

                              <p className="mt-2 font-semibold text-blue-400">
                                {COMMISSION_RATE}%
                              </p>
                            </div>

                          </div>


                          {/* NOTES */}
                          <textarea
                            name="notes"
                            rows={2}
                            defaultValue={
                              commission.notes ?? ""
                            }
                            placeholder="Notes"
                            className="w-full resize-none rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm text-white placeholder:text-slate-600"
                          />


                          {/* PAYMENT BUTTON */}
                          {paidAmount === 0 ? (
                            <button
                              type="submit"
                              name="status"
                              value="paid"
                              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold hover:bg-green-500"
                            >
                              Release 1st 50%
                            </button>
                          ) : (
                            <button
                              type="submit"
                              name="status"
                              value="paid"
                              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold hover:bg-green-500"
                            >
                              Release Final 50%
                            </button>
                          )}

                        </form>
                      </div>

                    </details>
                  );
                })}

              </div>
            )}
          </div>
        </section>

      </div>


      {/* =====================================================
          COMMISSION HISTORY
      ===================================================== */}

      <section className="mx-8 mb-8 rounded-2xl border border-white/10 bg-white/[0.03]">

        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-lg font-semibold">
            Commission History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Completed commissions kept for records and investigation.
          </p>
        </div>

        <div className="p-5">

          {paidHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
              <p className="text-sm text-slate-600">
                No completed commission history yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {paidHistory.map((commission) => {

                const owner = (
                  registeredProfiles ?? []
                ).find(
                  (person) =>
                    person.id === commission.user_id
                );

                return (
                  <details
                    key={commission.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-[#08111f]"
                  >

                    {/* HISTORY ROW */}
                    <summary className="cursor-pointer list-none px-5 py-4">

                      <div className="flex items-center justify-between gap-4">

                        <div>
                          <p className="font-semibold text-white">
                            {commission.project_name}
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            {commission.client_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {owner?.full_name ||
                              "Unknown BDE / VA"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">

                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                            Fully Paid
                          </span>

                          <span className="text-xs text-slate-500 transition-transform group-open:rotate-180">
                            ▼
                          </span>

                        </div>

                      </div>

                      <p className="mt-2 text-xs text-slate-600">
                        Click to view details
                      </p>

                    </summary>


                    {/* HISTORY DETAILS */}
                    <div className="border-t border-white/10 p-5">

                      <div className="grid gap-4 sm:grid-cols-4">

                        <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                          <p className="text-xs text-slate-500">
                            Client
                          </p>

                          <p className="mt-2 text-sm font-semibold text-white">
                            {commission.client_name}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                          <p className="text-xs text-slate-500">
                            Project
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            {commission.project_name}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                          <p className="text-xs text-slate-500">
                            BDE / VA
                          </p>

                          <p className="mt-2 text-sm text-blue-400">
                            {owner?.full_name ||
                              "Unknown BDE / VA"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                          <p className="text-xs text-slate-500">
                            Total Commission
                          </p>

                          <p className="mt-2 text-sm font-semibold text-green-400">
                            {money(
                              commission.commission_amount
                            )}
                          </p>
                        </div>

                      </div>

                      {commission.notes && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-[#050b18] p-4">
                          <p className="text-xs text-slate-500">
                            Notes
                          </p>

                          <p className="mt-2 text-sm text-slate-400">
                            {commission.notes}
                          </p>
                        </div>
                      )}

                    </div>

                  </details>
                );
              })}

            </div>
          )}

        </div>

      </section>

    </main>
  );
}