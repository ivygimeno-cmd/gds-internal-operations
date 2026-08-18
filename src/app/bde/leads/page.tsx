import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLead } from "@/app/actions/create-lead";
import { updateLead } from "@/app/actions/update-lead";
import RealtimeRefresh from "@/components/realtime-refresh";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    interested: "Interested",
    follow_up: "Follow-up",
    qualified: "Qualified",
    not_interested: "Not Interested",
    converted: "Converted",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-400",
    contacted: "bg-violet-500/10 text-violet-400",
    interested: "bg-emerald-500/10 text-emerald-400",
    follow_up: "bg-amber-500/10 text-amber-400",
    qualified: "bg-green-500/10 text-green-400",
    not_interested: "bg-slate-500/10 text-slate-500",
    converted: "bg-green-500/10 text-green-400",
  };

  return classes[status] ?? "bg-white/5 text-slate-400";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const activeStatus = params.status || "all";
  const searchQuery = (params.q || "").trim();

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

  let leadsQuery = admin
    .from("leads")
    .select(`
      id,
      created_by,
      client_name,
      business_name,
      email,
      phone,
      source_platform,
      status,
      notes,
      next_follow_up_at,
      created_at,
      updated_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (profile.role !== "admin") {
    leadsQuery = leadsQuery.eq(
      "created_by",
      user.id
    );
  }

  const { data: leads } = await leadsQuery;

  const allLeads = leads ?? [];

  const filteredLeads = allLeads.filter(
    (lead) => {
      const matchesStatus =
        activeStatus === "all" ||
        lead.status === activeStatus;

      const searchable = [
        lead.client_name,
        lead.business_name,
        lead.email,
        lead.phone,
        lead.source_platform,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchQuery ||
        searchable.includes(
          searchQuery.toLowerCase()
        );

      return matchesStatus && matchesSearch;
    }
  );

  const newCount = allLeads.filter(
    (lead) => lead.status === "new"
  ).length;

  const followUpCount = allLeads.filter(
    (lead) => lead.status === "follow_up"
  ).length;

  const qualifiedCount = allLeads.filter(
    (lead) => lead.status === "qualified"
  ).length;

  const filters = [
    {
      label: "All",
      value: "all",
    },
    {
      label: "New",
      value: "new",
    },
    {
      label: "Contacted",
      value: "contacted",
    },
    {
      label: "Interested",
      value: "interested",
    },
    {
      label: "Follow-up",
      value: "follow_up",
    },
    {
      label: "Qualified",
      value: "qualified",
    },
    {
      label: "Converted",
      value: "converted",
    },
  ];

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
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
              >
                My Leads
              </Link>

              <Link
                href="/bde/commission"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
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
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              {profile.profile_picture_url ? (
                <img
                  src={
                    profile.profile_picture_url
                  }
                  alt={profile.full_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400">
                  {profile.full_name
                    .split(" ")
                    .map(
                      (part: string) =>
                        part[0]
                    )
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
                My Leads
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Prospects, follow-ups and conversions in one place.
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
            {/* COUNTS */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  New Leads
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {newCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Follow-ups
                </p>

                <p className="mt-3 text-3xl font-semibold text-amber-400">
                  {followUpCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Qualified
                </p>

                <p className="mt-3 text-3xl font-semibold text-green-400">
                  {qualifiedCount}
                </p>
              </div>
            </div>

            {/* FILTERS + SEARCH */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => {
                    const href =
                      searchQuery
                        ? `/bde/leads?status=${filter.value}&q=${encodeURIComponent(
                            searchQuery
                          )}`
                        : `/bde/leads?status=${filter.value}`;

                    const isActive =
                      activeStatus ===
                      filter.value;

                    return (
                      <Link
                        key={filter.value}
                        href={href}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {filter.label}
                      </Link>
                    );
                  })}
                </div>

                <form
                  action="/bde/leads"
                  method="get"
                  className="flex min-w-[280px] gap-2"
                >
                  <input
                    type="hidden"
                    name="status"
                    value={activeStatus}
                  />

                  <input
                    name="q"
                    type="search"
                    defaultValue={
                      searchQuery
                    }
                    placeholder="Search client or business..."
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Search
                  </button>
                </form>
              </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
              {/* ADD LEAD */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">
                  Add Lead
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add a prospect before they become a registered client.
                </p>

                <form
                  action={createLead}
                  className="mt-6 space-y-4"
                >
                  <input
                    name="client_name"
                    required
                    placeholder="Client name"
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <input
                    name="business_name"
                    placeholder="Business name"
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <input
                    name="phone"
                    placeholder="Phone"
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <select
                    name="source_platform"
                    defaultValue=""
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm"
                  >
                    <option value="">
                      Source
                    </option>

                    <option value="Facebook">
                      Facebook
                    </option>

                    <option value="LinkedIn">
                      LinkedIn
                    </option>

                    <option value="Instagram">
                      Instagram
                    </option>

                    <option value="Referral">
                      Referral
                    </option>

                    <option value="Email">
                      Email
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                  <select
                    name="status"
                    defaultValue="new"
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm"
                  >
                    <option value="new">
                      New
                    </option>

                    <option value="contacted">
                      Contacted
                    </option>

                    <option value="interested">
                      Interested
                    </option>

                    <option value="follow_up">
                      Follow-up
                    </option>

                    <option value="qualified">
                      Qualified
                    </option>

                    <option value="not_interested">
                      Not Interested
                    </option>
                  </select>

                  <div>
                    <label className="mb-2 block text-xs text-slate-500">
                      Next Follow-up
                    </label>

                    <input
                      type="datetime-local"
                      name="next_follow_up_at"
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm"
                    />
                  </div>

                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Lead notes..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm placeholder:text-slate-600"
                  />

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
                  >
                    Add Lead
                  </button>
                </form>
              </section>

              {/* LEADS */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-6 py-5">
                  <h2 className="text-lg font-semibold">
                    {activeStatus === "all"
                      ? "All Leads"
                      : statusLabel(
                          activeStatus
                        )}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredLeads.length} result(s)
                  </p>
                </div>

                <div className="max-h-[720px] overflow-y-auto p-5">
                  {filteredLeads.length ===
                  0 ? (
                    <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-white/10">
                      <p className="text-sm text-slate-600">
                        No matching leads.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredLeads.map(
                        (lead) => (
                          <div
                            key={lead.id}
                            className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold">
                                  {
                                    lead.client_name
                                  }
                                </p>

                                {lead.business_name && (
                                  <p className="mt-1 text-sm text-slate-300">
                                    {
                                      lead.business_name
                                    }
                                  </p>
                                )}

                                {lead.source_platform && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Source:{" "}
                                    {
                                      lead.source_platform
                                    }
                                  </p>
                                )}
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs ${statusClass(
                                  lead.status
                                )}`}
                              >
                                {statusLabel(
                                  lead.status
                                )}
                              </span>
                            </div>

                            {(lead.email ||
                              lead.phone) && (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div>
                                  <p className="text-[10px] uppercase text-slate-600">
                                    Email
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {lead.email ||
                                      "Not provided"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] uppercase text-slate-600">
                                    Phone
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {lead.phone ||
                                      "Not provided"}
                                  </p>
                                </div>
                              </div>
                            )}

                            <form
                              action={
                                updateLead
                              }
                              className="mt-5 space-y-3 border-t border-white/10 pt-4"
                            >
                              <input
                                type="hidden"
                                name="lead_id"
                                value={lead.id}
                              />

                              <select
                                name="status"
                                defaultValue={
                                  lead.status
                                }
                                className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                              >
                                <option value="new">
                                  New
                                </option>

                                <option value="contacted">
                                  Contacted
                                </option>

                                <option value="interested">
                                  Interested
                                </option>

                                <option value="follow_up">
                                  Follow-up
                                </option>

                                <option value="qualified">
                                  Qualified
                                </option>

                                <option value="not_interested">
                                  Not Interested
                                </option>

                                <option value="converted">
                                  Converted
                                </option>
                              </select>

                              <input
                                type="datetime-local"
                                name="next_follow_up_at"
                                defaultValue={
                                  lead.next_follow_up_at
                                    ? new Date(
                                        lead.next_follow_up_at
                                      )
                                        .toISOString()
                                        .slice(
                                          0,
                                          16
                                        )
                                    : ""
                                }
                                className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                              />

                              <textarea
                                name="notes"
                                rows={3}
                                defaultValue={
                                  lead.notes ??
                                  ""
                                }
                                placeholder="Notes..."
                                className="w-full resize-none rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                              />

                              <button
                                type="submit"
                                className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20"
                              >
                                Update Lead
                              </button>
                            </form>

                            {lead.status ===
                              "qualified" && (
                              <Link
                                href={`/bde/register?lead=${lead.id}`}
                                className="mt-3 block w-full rounded-xl bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-green-500"
                              >
                                Convert to Client
                              </Link>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}