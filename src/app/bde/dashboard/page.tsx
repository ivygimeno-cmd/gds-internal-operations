import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/actions/logout";
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

  const sortedTeam = [...(productionTeam ?? [])].sort((a, b) => {
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
  });

  const waitingCount =
    submissions?.filter(
      (item) => item.status === "waiting"
    ).length ?? 0;

  const claimedCount =
    submissions?.filter(
      (item) => item.status === "claimed"
    ).length ?? 0;

  return (
    <main className="h-screen overflow-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex h-screen">
        {/* SIDEBAR */}
        <aside className="flex h-screen w-[285px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6">
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
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
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

            <div className="mt-7 space-y-1">
   <Link
  href="/bde/message-admin"
  className="block w-full rounded-xl bg-white/[0.04] px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/[0.08]"
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
                <p className="text-sm font-semibold">
                  {profile.full_name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {profile.username}
                </p>
              </div>
            </div>

           <div className="space-y-2">
  <Link
    href="/settings"
    className="block w-full rounded-xl border border-white/10 px-3 py-2.5 text-center text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
  >
    Settings
  </Link>

  <form action={logout}>
    <button
      type="submit"
      className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
    >
      Sign Out
    </button>
  </form>
</div>
          </div>
        </aside>

        {/* CENTER */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* HEADER */}
          <header className="flex h-[135px] shrink-0 items-center justify-between border-b border-white/10 px-8">
  <div>
    <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
      GDS Internal Operations
    </p>

    <h1 className="mt-2 text-2xl font-semibold">
      BDE Dashboard
    </h1>

    <p className="mt-1 text-sm text-slate-500">
      Welcome back, {profile.full_name}.
    </p>
  </div>

  <div className="flex items-center gap-3">
    {profile.role === "admin" && (
      <Link
        href="/admin/dashboard"
        className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
      >
        Back to Admin Dashboard
      </Link>
    )}

    <Link
      href="/bde/register"
      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
    >
      + Register Client
    </Link>
  </div>
</header>

          {/* CONTENT */}
          <div className="min-h-0 flex-1 overflow-hidden px-8 pb-8 pt-8">
            <div className="flex h-full flex-col">
              {/* COUNTERS */}
              <div className="grid shrink-0 grid-cols-3 gap-3">
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

              {/* LOWER */}
              <div className="mt-6 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px]">
                {/* MY SUBMISSIONS */}
                <section className="flex min-h-0 flex-col rounded-l-2xl border border-white/10 bg-white/[0.03]">
                  <div className="flex h-[115px] shrink-0 items-start justify-between border-b border-white/10 px-6 py-5">
                    <div>
                      <h2 className="text-xl font-semibold">
                        My Client Submissions
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Only clients registered by you appear here.
                      </p>
                    </div>

                    <Link
                      href="/bde/submissions"
                      className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {!submissions || submissions.length === 0 ? (
                      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-white/10">
                        <div className="text-center">
                          <p className="text-sm text-slate-500">
                            No client submissions yet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {submissions.slice(0, 6).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#08111f] px-5 py-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {item.client_name}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-400">
                                {item.business_name ||
                                  item.project_name}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${statusClass(
                                item.status
                              )}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* ON QUEUE */}
                <BdeQueue items={queueItems ?? []} />
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCTION TEAM */}
        <aside className="flex h-screen w-[410px] shrink-0 flex-col border-l border-white/10 bg-[#07111f] p-5">
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
                        src={member.profile_picture_url}
                        alt={member.full_name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400">
                        {member.full_name
                          .split(" ")
                          .map((part: string) => part[0])
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
<TeamChatContainer />
    </main>
  );
}