import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAvailability } from "@/app/actions/update-availability";
import { claimWork } from "@/app/actions/claim-work";
import RealtimeRefresh from "@/components/realtime-refresh";
import { logout } from "@/app/actions/logout";
import UnreadAdminMessageBadge from "@/components/unread-admin-message-badge";
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
    available: "text-green-400 bg-green-500/10",
    working: "text-blue-400 bg-blue-500/10",
    limited: "text-amber-400 bg-amber-500/10",
    fully_booked: "text-red-400 bg-red-500/10",
    meeting: "text-amber-400 bg-amber-500/10",
    break: "text-amber-400 bg-amber-500/10",
    leave: "text-slate-400 bg-slate-500/10",
    offline: "text-slate-500 bg-slate-500/10",
  };

  return classes[status] ?? "text-slate-400 bg-white/5";
}

function maskName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "Client";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export default async function DeveloperDashboard() {
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
      availability_status,
      available_again_at,
      availability_note,
      profile_picture_url
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    !["admin", "developer", "graphic_designer"].includes(profile.role)
  ) {
    redirect("/");
  }

  const { data: productionTeam } = await admin
    .from("profiles")
    .select(`
      id,
      username,
      full_name,
      role,
      title,
      availability_status,
      available_again_at,
      availability_note,
      team_sort_priority,
      profile_picture_url
    `)
    .in("role", ["admin", "developer", "graphic_designer"])
    .eq("is_active", true);

  const { data: queueItems } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      service_type,
      description,
      status,
      created_at
    `)
    .eq("status", "waiting")
    .order("created_at", {
      ascending: true,
    });

  const { data: myProjects } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      service_type,
      description,
      client_email,
      client_phone,
      source_platform,
      status,
      claimed_at,
      created_at
    `)
    .eq("claimed_by", user.id)
    .eq("status", "claimed")
    .order("claimed_at", {
      ascending: false,
    });

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

  return (
    <main className="h-screen overflow-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex h-screen">
        {/* WORKSPACE SIDEBAR */}
        <aside className="flex h-screen w-[285px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6">
          <Link href="/developer/dashboard">
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
    href="/developer/dashboard"
    className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
  >
    Dashboard
  </Link>

  <Link
    href="/bde/register"
    className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
  >
    Register Client
  </Link>

  <Link
    href="/developer/message-admin"
    className="flex items-center rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
  >
    <span>Message Admin</span>

    <UnreadAdminMessageBadge />
  </Link>
</nav>
          </div>

          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt={profile.full_name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-slate-400">
                  {profile.full_name
                    .split(" ")
                    .map((part: string) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {profile.full_name}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {profile.username}
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

        {/* TEAM AVAILABILITY */}
        <aside className="flex h-screen w-[380px] shrink-0 flex-col border-r border-white/10 bg-[#07111f]">
          <div className="shrink-0 border-b border-white/10 px-6 py-6">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
              Production Team
            </p>

            <h1 className="mt-2 text-xl font-semibold">
              Team Availability
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Live production availability
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              {sortedTeam.map((member) => (
                <div
                  key={member.id}
                  className={`rounded-2xl border p-4 ${
                    member.id === profile.id
                      ? "border-blue-500/50 bg-blue-500/[0.06]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {member.profile_picture_url ? (
                      <img
                        src={member.profile_picture_url}
                        alt={member.full_name}
                        className="h-12 w-12 shrink-0 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-400">
                        {member.full_name
                          .split(" ")
                          .map((part: string) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {member.full_name}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {member.title}
                      </p>

                      <span
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase ${availabilityClass(
                          member.availability_status
                        )}`}
                      >
                        {availabilityLabel(member.availability_status)}
                      </span>

                      {member.available_again_at && (
                        <p className="mt-2 text-[11px] leading-4 text-slate-500">
                          Available again:{" "}
                          {new Date(
                            member.available_again_at
                          ).toLocaleString()}
                        </p>
                      )}

                      {member.availability_note && (
                        <p className="mt-2 text-[11px] leading-4 text-slate-500">
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

        {/* MAIN */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-[135px] shrink-0 items-center justify-between gap-6 border-b border-white/10 px-8 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                Production Dashboard
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {profile.full_name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {profile.title}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {profile.role === "admin" && (
                <Link
                  href="/admin/dashboard"
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden p-8">
            <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
              {/* MY PROJECTS */}
              <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-6 py-5">
                  <div>
                    <h3 className="text-lg font-semibold">
                      My Projects
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Projects assigned or claimed by you.
                    </p>
                  </div>

                  <Link
                    href="/developer/projects"
                    className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    View All
                  </Link>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  {!myProjects || myProjects.length === 0 ? (
                    <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-white/10">
                      <div className="text-center">
                        <p className="text-sm text-slate-400">
                          No assigned projects yet.
                        </p>

                        <p className="mt-2 text-xs text-slate-600">
                          Claim available work from the queue.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myProjects.slice(0, 6).map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#08111f] px-5 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {project.business_name ||
                                project.client_name}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              {project.project_name}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-medium text-blue-400">
                            My Project
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* RIGHT COLUMN */}
              <aside className="flex min-h-0 flex-col gap-6">
                {/* AVAILABILITY */}
                <section className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-lg font-semibold">
                    My Availability
                  </h3>

                  <div className="mt-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${availabilityClass(
                        profile.availability_status
                      )}`}
                    >
                      {availabilityLabel(profile.availability_status)}
                    </span>
                  </div>

                  <form
                    action={updateAvailability}
                    className="mt-5 space-y-3"
                  >
                    <select
                      name="availability_status"
                      defaultValue={profile.availability_status}
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
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
                        profile.available_again_at
                          ? new Date(profile.available_again_at)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />

                    <textarea
                      name="availability_note"
                      rows={2}
                      defaultValue={profile.availability_note ?? ""}
                      placeholder="Optional note"
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Update Availability
                    </button>
                  </form>
                </section>

                {/* WORK QUEUE */}
                <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-6 py-5">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Work Queue
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Available client work.
                      </p>
                    </div>

                    <Link
                      href="/developer/queue"
                      className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {!queueItems || queueItems.length === 0 ? (
                      <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-white/10">
                        <p className="text-sm text-slate-600">
                          No work waiting.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {queueItems.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-[#08111f] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {maskName(item.client_name)}
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-300">
                                  {item.business_name ||
                                    item.project_name}
                                </p>

                                {item.service_type && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {item.service_type}
                                  </p>
                                )}
                              </div>

                              <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-400">
                                Waiting
                              </span>
                            </div>

                            <form
                              action={claimWork}
                              className="mt-4"
                            >
                              <input
                                type="hidden"
                                name="work_id"
                                value={item.id}
                              />

                              <button
                                type="submit"
                                className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                              >
                                Claim Project
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
      <TeamChatContainer />
    </main>
  );
}