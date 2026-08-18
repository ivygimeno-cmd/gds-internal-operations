import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminCreateCommission } from "@/app/actions/admin-create-commission";
import { adminSaveCommission } from "@/app/actions/admin-save-commission";
import RealtimeRefresh from "@/components/realtime-refresh";

function money(value: number | string | null) {
  const amount = Number(value || 0);

  return `${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} php`;
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

  const { data: people } = await admin
    .from("profiles")
    .select("id, full_name, username, role, title")
    .in("role", ["bde", "staff"])
    .eq("is_active", true)
    .order("full_name");

  const { data: commissions } = await admin
    .from("commissions")
    .select(`
      id,
      user_id,
      client_name,
      project_name,
      project_amount,
      commission_rate,
      commission_amount,
      status,
      notes,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  const rows = commissions ?? [];

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
            Create, approve and mark BDE/VA commissions as paid.
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
        {/* CREATE */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">
            Add Commission
          </h2>

          <form
            action={adminCreateCommission}
            className="mt-6 space-y-4"
          >
            <select
              name="user_id"
              required
              defaultValue=""
              className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm"
            >
              <option value="">
                Select BDE / VA
              </option>

              {(people ?? []).map((person) => (
                <option
                  key={person.id}
                  value={person.id}
                >
                  {person.full_name} -{" "}
                  {person.title || person.role}
                </option>
              ))}
            </select>

            <input
              name="client_name"
              required
              placeholder="Client name"
              className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm placeholder:text-slate-600"
            />

            <input
              name="project_name"
              required
              placeholder="Project name"
              className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm placeholder:text-slate-600"
            />

            <input
              name="project_amount"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Project amount"
              className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm placeholder:text-slate-600"
            />

            <input
              name="commission_rate"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Commission rate %"
              className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm placeholder:text-slate-600"
            />

            <textarea
              name="notes"
              rows={3}
              placeholder="Optional notes"
              className="w-full resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm placeholder:text-slate-600"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Create Commission
            </button>
          </form>
        </section>

        {/* LIST */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Commission Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {rows.length} record(s)
            </p>
          </div>

          <div className="max-h-[760px] overflow-y-auto p-5">
            {rows.length === 0 ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-white/10">
                <p className="text-sm text-slate-600">
                  No commission records yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((commission) => {
                  const owner = (people ?? []).find(
                    (person) =>
                      person.id === commission.user_id
                  );

                  return (
                    <form
                      key={commission.id}
                      action={adminSaveCommission}
                      className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
                    >
                      <input
                        type="hidden"
                        name="commission_id"
                        value={commission.id}
                      />

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {commission.client_name}
                          </p>

                          <p className="mt-1 text-sm text-slate-300">
                            {commission.project_name}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {owner?.full_name ||
                              "Unknown account"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs ${statusClass(
                            commission.status
                          )}`}
                        >
                          {commission.status}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs text-slate-500">
                            Project Amount
                          </label>

                          <input
                            name="project_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={
                              commission.project_amount
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-slate-500">
                            Commission Rate %
                          </label>

                          <input
                            name="commission_rate"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={
                              commission.commission_rate
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-slate-500">
                            Current Commission
                          </label>

                          <div className="rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm font-semibold text-green-400">
                            {money(
                              commission.commission_amount
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-slate-500">
                            Status
                          </label>

                          <select
                            name="status"
                            defaultValue={
                              commission.status
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                          >
                            <option value="pending">
                              Pending
                            </option>

                            <option value="approved">
                              Approved
                            </option>

                            <option value="paid">
                              Paid
                            </option>

                            <option value="cancelled">
                              Cancelled
                            </option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        name="notes"
                        rows={2}
                        defaultValue={
                          commission.notes ?? ""
                        }
                        placeholder="Notes"
                        className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm placeholder:text-slate-600"
                      />

                      <button
                        type="submit"
                        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
                      >
                        Save Commission
                      </button>
                    </form>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}