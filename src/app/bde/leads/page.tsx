import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { createLead } from "@/app/actions/create-lead";
import { updateLead } from "@/app/actions/update-lead";

import RealtimeRefresh from "@/components/realtime-refresh";
import BdeSidebar from "@/components/bde-sidebar";

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

  const filteredLeads = allLeads.filter((lead) => {
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
  });

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
    <main className="min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex min-h-screen flex-col lg:flex-row">

        {/* ====================================================== */}
        {/* SIDEBAR */}
        {/* ====================================================== */}

        <BdeSidebar
          profile={profile}
          activePage="leads"
        />

        {/* ====================================================== */}
        {/* MAIN */}
        {/* ====================================================== */}

        <section className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="border-b border-white/10 px-4 py-5 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8 lg:py-6">

            <div className="min-w-0">

              <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 sm:text-xs">
                GDS Internal Operations
              </p>

              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl lg:text-2xl">
                My Leads
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Prospects, follow-ups and conversions in one place.
              </p>

            </div>

            <Link
              href="/bde/dashboard"
              className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white lg:mt-0"
            >
              Back to Dashboard
            </Link>

          </header>

          <div className="p-4 sm:p-6 lg:p-8">

            {/* ================================================== */}
            {/* COUNTS */}
            {/* ================================================== */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">

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

            {/* ================================================== */}
            {/* FILTERS + SEARCH */}
            {/* ================================================== */}

            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:mt-6 sm:p-5">

              {/* FILTER SCROLL */}

              <div className="-mx-1 overflow-x-auto px-1 pb-2">

                <div className="flex w-max gap-2">

                  {filters.map((filter) => {

                    const href =
                      searchQuery
                        ? `/bde/leads?status=${filter.value}&q=${encodeURIComponent(
                            searchQuery
                          )}`
                        : `/bde/leads?status=${filter.value}`;

                    const isActive =
                      activeStatus === filter.value;

                    return (
                      <Link
                        key={filter.value}
                        href={href}
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
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

              </div>

              {/* SEARCH */}

              <form
                action="/bde/leads"
                method="get"
                className="mt-3 flex w-full flex-col gap-2 sm:flex-row"
              >

                <input
                  type="hidden"
                  name="status"
                  value={activeStatus}
                />

                <input
                  name="q"
                  type="search"
                  defaultValue={searchQuery}
                  placeholder="Search client or business..."
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />

                <button
                  type="submit"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5"
                >
                  Search
                </button>

              </form>

            </section>

            {/* ================================================== */}
            {/* ADD LEAD + LEADS */}
            {/* ================================================== */}

            <div className="mt-5 grid gap-5 lg:mt-6 xl:grid-cols-[390px_1fr]">

              {/* ================================================= */}
              {/* ADD LEAD */}
              {/* ================================================= */}

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">

                <h2 className="text-lg font-semibold">
                  Add Lead
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
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
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500"
                  >
                    Add Lead
                  </button>

                </form>

              </section>

              {/* ================================================= */}
              {/* LEADS */}
              {/* ================================================= */}

              <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03]">

                <div className="border-b border-white/10 px-5 py-5 sm:px-6">

                  <h2 className="text-lg font-semibold">

                    {activeStatus === "all"
                      ? "All Leads"
                      : statusLabel(activeStatus)}

                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredLeads.length} result(s)
                  </p>

                </div>

                <div className="max-h-none overflow-y-visible p-4 sm:max-h-[720px] sm:overflow-y-auto sm:p-5">

                  {filteredLeads.length === 0 ? (

                    <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10 sm:min-h-[420px]">

                      <p className="text-center text-sm text-slate-600">
                        No matching leads.
                      </p>

                    </div>

                  ) : (

                    <div className="space-y-4">

                      {filteredLeads.map((lead) => (

                        <div
                          key={lead.id}
                          className="rounded-2xl border border-white/10 bg-[#08111f] p-4 sm:p-5"
                        >

                          {/* LEAD HEADER */}

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <p className="break-words font-semibold text-white">
                                {lead.client_name}
                              </p>

                              {lead.business_name && (
                                <p className="mt-1 break-words text-sm text-slate-300">
                                  {lead.business_name}
                                </p>
                              )}

                              {lead.source_platform && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Source:{" "}
                                  {lead.source_platform}
                                </p>
                              )}

                            </div>

                            <span
                              className={`self-start rounded-full px-3 py-1 text-xs ${statusClass(
                                lead.status
                              )}`}
                            >
                              {statusLabel(lead.status)}
                            </span>

                          </div>

                          {/* CONTACT DETAILS */}

                          {(lead.email || lead.phone) && (

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">

                              <div className="min-w-0">

                                <p className="text-[10px] uppercase text-slate-600">
                                  Email
                                </p>

                                <p className="mt-1 break-all text-xs text-slate-400">
                                  {lead.email ||
                                    "Not provided"}
                                </p>

                              </div>

                              <div className="min-w-0">

                                <p className="text-[10px] uppercase text-slate-600">
                                  Phone
                                </p>

                                <p className="mt-1 break-words text-xs text-slate-400">
                                  {lead.phone ||
                                    "Not provided"}
                                </p>

                              </div>

                            </div>

                          )}

                          {/* UPDATE */}

                          <form
                            action={updateLead}
                            className="mt-5 space-y-3 border-t border-white/10 pt-4"
                          >

                            <input
                              type="hidden"
                              name="lead_id"
                              value={lead.id}
                            />

                            <select
                              name="status"
                              defaultValue={lead.status}
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
                                      .slice(0, 16)
                                  : ""
                              }
                              className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                            />

                            <textarea
                              name="notes"
                              rows={3}
                              defaultValue={
                                lead.notes ?? ""
                              }
                              placeholder="Notes..."
                              className="w-full resize-none rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm"
                            />

                            <button
                              type="submit"
                              className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20"
                            >
                              Update Lead
                            </button>

                          </form>

                          {/* CONVERT */}

                          {lead.status === "qualified" && (

                            <Link
                              href={`/bde/register?lead=${lead.id}`}
                              className="mt-3 block w-full rounded-xl bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-green-500"
                            >
                              Convert to Client
                            </Link>

                          )}

                        </div>

                      ))}

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