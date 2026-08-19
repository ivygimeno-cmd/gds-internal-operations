import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import BdeSidebar from "@/components/bde-sidebar";
import RealtimeRefresh from "@/components/realtime-refresh";
import BdeQueue from "@/components/bde-queue";
import TeamChatContainer from "@/components/team-chat";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    waiting: "Waiting",
    claimed: "Claimed",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    waiting: "bg-amber-500/10 text-amber-400",
    claimed: "bg-green-500/10 text-green-400",
    cancelled: "bg-slate-500/10 text-slate-400",
  };

  return classes[status] ?? "bg-white/5 text-slate-400";
}

function availabilityLabel(status: string) {
  const labels: Record<string, string> = {
    available: "Available",
    working: "Working",
    limited: "Limited Availability",
    fully_booked: "Fully Booked",
    meeting: "On Meeting",
    break: "On Break",
    leave: "On Leave",
    offline: "Offline",
  };

  return labels[status] ?? status;
}

function availabilityClass(status: string) {
  const classes: Record<string, string> = {
    available: "bg-green-500/10 text-green-400",
    working: "bg-blue-500/10 text-blue-400",
    limited: "bg-amber-500/10 text-amber-400",
    fully_booked: "bg-red-500/10 text-red-400",
    meeting: "bg-amber-500/10 text-amber-400",
    break: "bg-amber-500/10 text-amber-400",
    leave: "bg-slate-500/10 text-slate-400",
    offline: "bg-slate-500/10 text-slate-500",
  };

  return classes[status] ?? "bg-white/5 text-slate-400";
}

function availabilityRank(status: string) {
  const order: Record<string, number> = {
    available: 1,
    limited: 2,
    working: 3,
    meeting: 4,
    break: 5,
    fully_booked: 6,
    leave: 7,
    offline: 8,
  };

  return order[status] ?? 99;
}

export default async function BdeDashboard() {
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

  const { data: submissions } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      service_type,
      description,
      status,
      created_at,
      claimed_at
    `)
    .eq("submitted_by", user.id)
    .order("created_at", {
      ascending: false,
    });

  const { data: queueItems } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      service_type,
      client_email,
      client_phone,
      status,
      created_at
    `)
    .eq("status", "waiting")
    .order("created_at", {
      ascending: true,
    });

  const { data: productionTeam } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      title,
      role,
      profile_picture_url,
      availability_status,
      available_again_at,
      availability_note,
      team_sort_priority
    `)
    .in("role", [
      "admin",
      "developer",
      "graphic_designer",
    ])
    .eq("is_active", true);

  const sortedTeam = [...(productionTeam ?? [])].sort(
    (a, b) => {
      const priorityA = a.team_sort_priority ?? 999;
      const priorityB = b.team_sort_priority ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const statusDifference =
        availabilityRank(a.availability_status) -
        availabilityRank(b.availability_status);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return a.full_name.localeCompare(b.full_name);
    }
  );

  const waitingCount =
    submissions?.filter(
      (item) => item.status === "waiting"
    ).length ?? 0;

  const claimedCount =
    submissions?.filter(
      (item) => item.status === "claimed"
    ).length ?? 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      {/* ====================================================== */}
      {/* IMPORTANT:
          Mobile  = column
          Desktop = row
      */}
      {/* ====================================================== */}

      <div className="flex min-h-screen flex-col md:flex-row">

        {/* ====================================================== */}
        {/* SIDEBAR / MOBILE TOP BAR */}
        {/* ====================================================== */}

        <BdeSidebar
          profile={profile}
          activePage="dashboard"
        />

        {/* ====================================================== */}
        {/* MAIN AREA */}
        {/* ====================================================== */}

        <div className="min-w-0 flex-1">

          {/* ==================================================== */}
          {/* HEADER */}
          {/* ==================================================== */}

          <header className="border-b border-white/10 px-4 py-5 sm:px-6 md:px-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="min-w-0">

                <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                  GDS Internal Operations
                </p>

                <h1 className="mt-2 text-2xl font-semibold">
                  BDE Dashboard
                </h1>

                <p className="mt-1 truncate text-sm text-slate-500">
                  Welcome back, {profile.full_name}.
                </p>

              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

                {profile.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    className="w-full rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white sm:w-auto"
                  >
                    Back to Admin Dashboard
                  </Link>
                )}

                <Link
                  href="/bde/register"
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500 sm:w-auto"
                >
                  + Register Client
                </Link>

              </div>

            </div>

          </header>

          {/* ==================================================== */}
          {/* CONTENT */}
          {/* ==================================================== */}

          <div className="px-4 pb-8 pt-5 sm:px-6 md:px-8 md:pt-8">

            <div>

              {/* ================================================= */}
              {/* COUNTERS */}
              {/* ================================================= */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                  <p className="text-sm text-slate-500">
                    My Submissions
                  </p>

                  <p className="mt-3 text-3xl font-semibold">
                    {submissions?.length ?? 0}
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                  <p className="text-sm text-slate-500">
                    Waiting
                  </p>

                  <p className="mt-3 text-3xl font-semibold text-amber-400">
                    {waitingCount}
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                  <p className="text-sm text-slate-500">
                    Claimed
                  </p>

                  <p className="mt-3 text-3xl font-semibold text-green-400">
                    {claimedCount}
                  </p>

                </div>

              </div>

              {/* ================================================= */}
              {/* SUBMISSIONS + QUEUE */}
              {/* ================================================= */}

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">

                {/* =============================================== */}
                {/* MY SUBMISSIONS */}
                {/* =============================================== */}

                <section className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-white/[0.03]">

                  <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">

                    <div className="min-w-0">

                      <h2 className="text-xl font-semibold">
                        My Client Submissions
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Only clients registered by you appear here.
                      </p>

                    </div>

                    <Link
                      href="/bde/submissions"
                      className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-center text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      View All
                    </Link>

                  </div>

                  <div className="p-4 sm:p-5">

                    {!submissions ||
                    submissions.length === 0 ? (

                      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-white/10">

                        <div className="text-center">

                          <p className="text-sm text-slate-500">
                            No client submissions yet.
                          </p>

                        </div>

                      </div>

                    ) : (

                      <div className="space-y-3">

                        {submissions
                          .slice(0, 6)
                          .map((item) => (

                            <div
                              key={item.id}
                              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#08111f] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                            >

                              <div className="min-w-0">

                                <p className="truncate text-sm font-semibold text-white">
                                  {item.client_name}
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {item.business_name ||
                                    item.project_name}
                                </p>

                                {item.service_type && (
                                  <p className="mt-1 truncate text-[11px] text-slate-600">
                                    {item.service_type}
                                  </p>
                                )}

                              </div>

                              <span
                                className={`self-start rounded-full px-3 py-1 text-[10px] font-medium sm:self-auto ${statusClass(
                                  item.status
                                )}`}
                              >
                                {statusLabel(
                                  item.status
                                )}
                              </span>

                            </div>

                          ))}

                      </div>

                    )}

                  </div>

                </section>

                {/* =============================================== */}
                {/* ON QUEUE */}
                {/* =============================================== */}

                <div className="min-w-0">

                  <BdeQueue
                    items={queueItems ?? []}
                  />

                </div>

              </div>

              {/* ================================================= */}
              {/* MOBILE PRODUCTION TEAM */}
              {/* ================================================= */}

              <section className="mt-4 lg:hidden">

                <div className="rounded-2xl border border-white/10 bg-white/[0.03]">

                  <div className="border-b border-white/10 px-5 py-5">

                    <h2 className="text-lg font-semibold">
                      Production Team
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Live availability
                    </p>

                  </div>

                  <div className="space-y-3 p-4">

                    {sortedTeam.map((member) => (

                      <div
                        key={member.id}
                        className="rounded-xl border border-white/10 bg-[#08111f] p-4"
                      >

                        <div className="flex items-start gap-3">

                          {member.profile_picture_url ? (

                            <img
                              src={
                                member.profile_picture_url
                              }
                              alt={member.full_name}
                              className="h-11 w-11 shrink-0 rounded-full object-cover"
                            />

                          ) : (

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400">

                              {member.full_name
                                .split(" ")
                                .map(
                                  (
                                    part: string
                                  ) => part[0]
                                )
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}

                            </div>

                          )}

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-semibold text-white">
                              {member.full_name}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {member.title}
                            </p>

                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase ${availabilityClass(
                                member.availability_status
                              )}`}
                            >
                              {availabilityLabel(
                                member.availability_status
                              )}
                            </span>

                            {member.available_again_at && (
                              <p className="mt-2 text-[11px] leading-4 text-slate-600">
                                Available again:{" "}
                                {new Date(
                                  member.available_again_at
                                ).toLocaleString()}
                              </p>
                            )}

                            {member.availability_note && (
                              <p className="mt-2 text-[11px] leading-4 text-slate-600">
                                {member.availability_note}
                              </p>
                            )}

                          </div>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              </section>

            </div>

          </div>

        </div>

        {/* ====================================================== */}
        {/* DESKTOP PRODUCTION TEAM */}
        {/* ====================================================== */}

        <aside className="hidden h-screen w-[410px] shrink-0 flex-col border-l border-white/10 bg-[#07111f] p-5 lg:flex">

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">

            <div className="shrink-0 border-b border-white/10 px-6 py-5">

              <h2 className="text-lg font-semibold">
                Production Team
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Live availability
              </p>

            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">

              {sortedTeam.map((member) => (

                <div
                  key={member.id}
                  className="rounded-2xl border border-white/10 bg-[#08111f] p-4"
                >

                  <div className="flex items-start gap-4">

                    {member.profile_picture_url ? (

                      <img
                        src={
                          member.profile_picture_url
                        }
                        alt={member.full_name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />

                    ) : (

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400">

                        {member.full_name
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
                        {member.full_name}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {member.title}
                      </p>

                      <span
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase ${availabilityClass(
                          member.availability_status
                        )}`}
                      >
                        {availabilityLabel(
                          member.availability_status
                        )}
                      </span>

                      {member.available_again_at && (
                        <p className="mt-2 text-[11px] leading-4 text-slate-600">
                          Available again:{" "}
                          {new Date(
                            member.available_again_at
                          ).toLocaleString()}
                        </p>
                      )}

                      {member.availability_note && (
                        <p className="mt-2 text-[11px] leading-4 text-slate-600">
                          {member.availability_note}
                        </p>
                      )}

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </aside>

      </div>

      {/* ====================================================== */}
      {/* TEAM CHAT */}
      {/* ====================================================== */}

      <TeamChatContainer />

    </main>
  );
}