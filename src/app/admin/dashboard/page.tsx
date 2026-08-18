import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/actions/logout";
import { adminUpdateAvailability } from "@/app/actions/admin-update-availability";
import RealtimeRefresh from "@/components/realtime-refresh";
import TeamChatContainer from "@/components/team-chat";

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

function maskName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "Client";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[
    parts.length - 1
  ].charAt(0).toUpperCase()}.`;
}

export default async function AdminDashboard() {
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
      availability_status
    `)
    .eq("id", user.id)
    .maybeSingle();

   if (
    !profile ||
    !profile.is_active ||
    profile.role !== "admin"
  ) {
    redirect("/");
  }

  

  const { count: unreadMessageCount } = await admin
    .from("admin_messages")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  const { data: team } = await admin
    .from("profiles")
    .select(`
      id,
      username,
      full_name,
      role,
      title,
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

  const { data: queueItems } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      service_type,
      status,
      created_at
    `)
    .eq("status", "waiting")
    .order("created_at", {
      ascending: true,
    });

  const { data: activeProjects } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      project_status,
      claimed_by,
      claimed_at
    `)
    .eq("status", "claimed")
    .neq("project_status", "completed")
    .order("claimed_at", {
      ascending: false,
    });

  const sortedTeam = [...(team ?? [])].sort((a, b) => {
    const priorityA =
      a.team_sort_priority ?? 999;

    const priorityB =
      b.team_sort_priority ?? 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const statusDifference =
      availabilityRank(
        a.availability_status
      ) -
      availabilityRank(
        b.availability_status
      );

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return a.full_name.localeCompare(
      b.full_name
    );
  });

  const activeNow = sortedTeam.filter(
    (member) =>
      member.availability_status !==
        "offline" &&
      member.availability_status !==
        "leave"
  ).length;

  const availableNow = sortedTeam.filter(
    (member) =>
      member.availability_status ===
      "available"
  ).length;

  const workingNow = sortedTeam.filter(
    (member) =>
      member.availability_status ===
      "working"
  ).length;

  return (
    <main className="h-screen overflow-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex h-screen">
        {/* SIDEBAR */}
        <aside className="flex h-screen w-[285px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6">
          <Link href="/admin/dashboard">
            <img
              src="/gds-logo.png"
              alt="Gimeno Design Solutions"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* WORKSPACE */}
          <div className="mt-8">
            <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>

            <nav className="mt-3 space-y-1">
              <Link
                href="/admin/dashboard"
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
              >
                Dashboard
              </Link>

              {/* BDE VIEW */}
              <Link
                href="/bde/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                BDE Dashboard
              </Link>

              {/* SAME REGISTER CLIENT AS BDE */}
        

              {/* PRODUCTION VIEW */}
              <Link
                href="/developer/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Production Dashboard
              </Link>

       

              <Link
                href="/admin/projects"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Projects
              </Link>

              <Link
                href="/admin/team"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Team
              </Link>

              <Link
                href="/admin/commissions"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Commissions
              </Link>

              <Link
                href="/admin/announcements"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Announcements
              </Link>

            <Link
  href="/admin/messages"
  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
>
  <span>Messages</span>

  {unreadMessageCount && unreadMessageCount > 0 ? (
    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
  ) : null}
</Link>
            </nav>
          </div>

          {/* SYSTEM */}
          <div className="mt-8">
            <p className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              System
            </p>

            <nav className="mt-3 space-y-1">
              <Link
                href="/admin/management"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Management
              </Link>

              <Link
                href="/admin/administration"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Administration
              </Link>
            </nav>
          </div>

          {/* ACCOUNT */}
          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              {profile.profile_picture_url ? (
                <img
                  src={
                    profile.profile_picture_url
                  }
                  alt={profile.full_name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-slate-400">
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
                <p className="truncate text-sm font-semibold">
                  {profile.full_name}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {profile.username}
                </p>

                <p className="mt-1 text-[10px] uppercase tracking-wide text-blue-400">
                  Admin
                </p>
              </div>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-white/10 px-8 py-6">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
              GDS Internal Operations
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              Operations Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Live team status, availability and
              production queue.
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-8">
            {/* COUNTS */}
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Active Team
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {activeNow}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Available Now
                </p>

                <p className="mt-3 text-3xl font-semibold text-green-400">
                  {availableNow}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Working
                </p>

                <p className="mt-3 text-3xl font-semibold text-blue-400">
                  {workingNow}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Active Projects
                </p>

                <p className="mt-3 text-3xl font-semibold text-violet-400">
                  {activeProjects?.length ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
              {/* TEAM */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-6 py-5">
                  <h2 className="text-lg font-semibold">
                    Team Availability
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Live production availability
                  </p>
                </div>

                <div className="max-h-[700px] space-y-4 overflow-y-auto p-5">
                  {sortedTeam.map(
                    (member) => (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
                      >
                        <div className="flex items-start gap-4">
                          {member.profile_picture_url ? (
                            <img
                              src={
                                member.profile_picture_url
                              }
                              alt={
                                member.full_name
                              }
                              className="h-14 w-14 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-slate-400">
                              {member.full_name
                                .split(" ")
                                .map(
                                  (
                                    part: string
                                  ) =>
                                    part[0]
                                )
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {
                                member.full_name
                              }
                            </p>

                            <p className="mt-1 text-sm leading-5 text-slate-400">
                              {member.title}
                            </p>

                            <span
                              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${availabilityClass(
                                member.availability_status
                              )}`}
                            >
                              {availabilityLabel(
                                member.availability_status
                              )}
                            </span>

                            {member.available_again_at && (
                              <p className="mt-3 text-xs text-slate-500">
                                Available again:{" "}
                                {new Date(
                                  member.available_again_at
                                ).toLocaleString()}
                              </p>
                            )}

                            {member.availability_note && (
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {
                                  member.availability_note
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <form
                          action={
                            adminUpdateAvailability
                          }
                          className="mt-5 border-t border-white/10 pt-4"
                        >
                          <input
                            type="hidden"
                            name="employee_id"
                            value={
                              member.id
                            }
                          />

                          <label className="text-xs text-slate-500">
                            Update Status
                          </label>

                          <select
                            name="availability_status"
                            defaultValue={
                              member.availability_status
                            }
                            className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b18] px-3 py-2.5 text-sm text-white"
                          >
                            <option value="available">
                              Available
                            </option>

                            <option value="working">
                              Working
                            </option>

                            <option value="limited">
                              Limited Availability
                            </option>

                            <option value="fully_booked">
                              Fully Booked
                            </option>

                            <option value="meeting">
                              On Meeting
                            </option>

                            <option value="break">
                              On Break
                            </option>

                            <option value="leave">
                              On Leave
                            </option>

                            <option value="offline">
                              Offline
                            </option>
                          </select>

                          <input
                            type="datetime-local"
                            name="available_again_at"
                            defaultValue={
                              member.available_again_at
                                ? new Date(
                                    member.available_again_at
                                  )
                                    .toISOString()
                                    .slice(
                                      0,
                                      16
                                    )
                                : ""
                            }
                            className="mt-3 w-full rounded-xl border border-white/10 bg-[#050b18] px-3 py-2.5 text-sm"
                          />

                          <textarea
                            name="availability_note"
                            rows={2}
                            defaultValue={
                              member.availability_note ??
                              ""
                            }
                            placeholder="Optional note"
                            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#050b18] px-3 py-2.5 text-sm placeholder:text-slate-600"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium hover:bg-blue-500"
                          >
                            Update
                          </button>
                        </form>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/* RIGHT */}
              <section className="space-y-6">
                {/* QUEUE */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Work Queue
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Unclaimed client work.
                      </p>
                    </div>

                    <Link
                      href="/developer/queue"
                      className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="p-5">
                    {!queueItems ||
                    queueItems.length === 0 ? (
                      <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-dashed border-white/10">
                        <p className="text-sm text-slate-600">
                          No work waiting.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {queueItems
                          .slice(0, 5)
                          .map((item) => (
                            <div
                              key={
                                item.id
                              }
                              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#08111f] px-5 py-4"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {maskName(
                                    item.client_name
                                  )}
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {item.business_name ||
                                    item.project_name}
                                </p>

                                {item.service_type && (
                                  <p className="mt-1 text-[10px] text-slate-600">
                                    {
                                      item.service_type
                                    }
                                  </p>
                                )}
                              </div>

                              <span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] uppercase text-amber-400">
                                Waiting
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* QUICK ACCESS */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h2 className="text-lg font-semibold">
                    Quick Access
                  </h2>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <Link
                      href="/bde/dashboard"
                      className="rounded-xl border border-white/10 bg-[#08111f] p-5 transition hover:border-blue-500/40 hover:bg-blue-500/[0.05]"
                    >
                      <p className="font-semibold">
                        BDE Dashboard
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Open the same dashboard used
                        by BDE/VA accounts.
                      </p>
                    </Link>

                    <Link
                      href="/bde/register"
                      className="rounded-xl border border-blue-500/30 bg-blue-500/[0.05] p-5 transition hover:bg-blue-500/[0.1]"
                    >
                      <p className="font-semibold text-blue-400">
                        Register Client
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Register a new client using
                        the same BDE form.
                      </p>
                    </Link>

                    <Link
                      href="/developer/dashboard"
                      className="rounded-xl border border-white/10 bg-[#08111f] p-5 transition hover:border-blue-500/40 hover:bg-blue-500/[0.05]"
                    >
                      <p className="font-semibold">
                        Production Dashboard
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Open your developer
                        production workspace.
                      </p>
                    </Link>

                    <Link
                      href="/admin/messages"
                      className="rounded-xl border border-white/10 bg-[#08111f] p-5 transition hover:border-blue-500/40 hover:bg-blue-500/[0.05]"
                    >
                      <p className="font-semibold">
                        Messages
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        View private BDE/VA
                        messages.
                      </p>
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
  <TeamChatContainer />
    </main>
  );
}