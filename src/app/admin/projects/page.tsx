import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RealtimeRefresh from "@/components/realtime-refresh";

function projectStatusLabel(status: string | null) {
  const labels: Record<string, string> = {
    in_progress: "In Progress",
    waiting_client: "Waiting for Client",
    revision: "Revision",
    testing: "Testing",
    completed: "Completed",
  };

  return labels[status || "in_progress"] ?? "In Progress";
}

function projectStatusClass(status: string | null) {
  const classes: Record<string, string> = {
    in_progress: "bg-blue-500/10 text-blue-400",
    waiting_client: "bg-amber-500/10 text-amber-400",
    revision: "bg-violet-500/10 text-violet-400",
    testing: "bg-cyan-500/10 text-cyan-400",
    completed: "bg-green-500/10 text-green-400",
  };

  return (
    classes[status || "in_progress"] ??
    "bg-blue-500/10 text-blue-400"
  );
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const activeStatus =
    params.status || "all";

  const searchQuery =
    (params.q || "").trim().toLowerCase();

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
      full_name,
      username,
      role,
      is_active
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

  const { data: projects } = await admin
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
      submitted_by,
      claimed_by,
      status,
      project_status,
      expected_completion_at,
      project_note,
      claimed_at,
      completed_at,
      created_at
    `)
    .eq("status", "claimed")
    .order("claimed_at", {
      ascending: false,
    });

  const claimedUserIds = Array.from(
    new Set(
      (projects ?? [])
        .map((project) => project.claimed_by)
        .filter(Boolean)
    )
  );

  const submittedUserIds = Array.from(
    new Set(
      (projects ?? [])
        .map((project) => project.submitted_by)
        .filter(Boolean)
    )
  );

  const allUserIds = Array.from(
    new Set([
      ...claimedUserIds,
      ...submittedUserIds,
    ])
  );

  let people: {
    id: string;
    full_name: string;
    username: string;
    role: string;
    title: string | null;
    profile_picture_url: string | null;
  }[] = [];

  if (allUserIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        role,
        title,
        profile_picture_url
      `)
      .in("id", allUserIds);

    people = data ?? [];
  }

  function getPerson(id: string | null) {
    if (!id) {
      return null;
    }

    return (
      people.find(
        (person) => person.id === id
      ) ?? null
    );
  }

  const allProjects = projects ?? [];

  const filteredProjects =
    allProjects.filter((project) => {
      const status =
        project.project_status ||
        "in_progress";

      const matchesStatus =
        activeStatus === "all" ||
        status === activeStatus;

      const claimant = getPerson(
        project.claimed_by
      );

      const searchable = [
        project.client_name,
        project.business_name,
        project.project_name,
        project.service_type,
        claimant?.full_name,
        claimant?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchQuery ||
        searchable.includes(searchQuery);

      return (
        matchesStatus &&
        matchesSearch
      );
    });

  const activeCount =
    allProjects.filter(
      (project) =>
        (project.project_status ||
          "in_progress") !==
        "completed"
    ).length;

  const waitingCount =
    allProjects.filter(
      (project) =>
        project.project_status ===
        "waiting_client"
    ).length;

  const completedCount =
    allProjects.filter(
      (project) =>
        project.project_status ===
        "completed"
    ).length;

  const filters = [
    {
      label: "All",
      value: "all",
    },
    {
      label: "In Progress",
      value: "in_progress",
    },
    {
      label: "Waiting Client",
      value: "waiting_client",
    },
    {
      label: "Revision",
      value: "revision",
    },
    {
      label: "Testing",
      value: "testing",
    },
    {
      label: "Completed",
      value: "completed",
    },
  ];

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="flex min-h-screen w-[285px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6">
          <Link href="/admin/dashboard">
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
                href="/admin/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/developer/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                My Production Dashboard
              </Link>

              <Link
                href="/bde/register"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Register Client
              </Link>

           

              <Link
                href="/admin/projects"
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
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
            </nav>
          </div>

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
        </aside>

        {/* MAIN */}
        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-white/10 px-8 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                GDS Internal Operations
              </p>

              <h1 className="mt-2 text-2xl font-semibold">
                Projects
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor all claimed production work.
              </p>
            </div>

            <Link
              href="/developer/queue"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              View Work Queue
            </Link>
          </header>

          <div className="p-8">
            {/* COUNTS */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Active Projects
                </p>

                <p className="mt-3 text-3xl font-semibold text-blue-400">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Waiting for Client
                </p>

                <p className="mt-3 text-3xl font-semibold text-amber-400">
                  {waitingCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-500">
                  Completed
                </p>

                <p className="mt-3 text-3xl font-semibold text-green-400">
                  {completedCount}
                </p>
              </div>
            </div>

            {/* FILTERS */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => {
                    const href =
                      searchQuery
                        ? `/admin/projects?status=${filter.value}&q=${encodeURIComponent(
                            searchQuery
                          )}`
                        : `/admin/projects?status=${filter.value}`;

                    const active =
                      activeStatus ===
                      filter.value;

                    return (
                      <Link
                        key={filter.value}
                        href={href}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                          active
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
                  action="/admin/projects"
                  method="get"
                  className="flex min-w-[320px] gap-2"
                >
                  <input
                    type="hidden"
                    name="status"
                    value={activeStatus}
                  />

                  <input
                    name="q"
                    type="search"
                    defaultValue={params.q || ""}
                    placeholder="Search project, client or developer..."
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
                  >
                    Search
                  </button>
                </form>
              </div>
            </section>

            {/* PROJECTS */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-lg font-semibold">
                  Production Projects
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredProjects.length} project(s)
                </p>
              </div>

              <div className="p-5">
                {filteredProjects.length === 0 ? (
                  <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-white/10">
                    <p className="text-sm text-slate-600">
                      No matching projects.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProjects.map(
                      (project) => {
                        const developer =
                          getPerson(
                            project.claimed_by
                          );

                        const submitter =
                          getPerson(
                            project.submitted_by
                          );

                        return (
                          <article
                            key={project.id}
                            className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-5">
                              <div className="min-w-0">
                                <p className="text-lg font-semibold text-white">
                                  {project.business_name ||
                                    project.client_name}
                                </p>

                                <p className="mt-1 text-sm text-slate-300">
                                  {
                                    project.project_name
                                  }
                                </p>

                                {project.service_type && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      project.service_type
                                    }
                                  </p>
                                )}
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${projectStatusClass(
                                  project.project_status
                                )}`}
                              >
                                {projectStatusLabel(
                                  project.project_status
                                )}
                              </span>
                            </div>

                            {/* ASSIGNED */}
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                  Assigned Production
                                </p>

                                <div className="mt-3 flex items-center gap-3">
                                  {developer?.profile_picture_url ? (
                                    <img
                                      src={
                                        developer.profile_picture_url
                                      }
                                      alt={
                                        developer.full_name
                                      }
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400">
                                      {developer
                                        ? developer.full_name
                                            .split(
                                              " "
                                            )
                                            .map(
                                              (
                                                part: string
                                              ) =>
                                                part[0]
                                            )
                                            .join("")
                                            .slice(
                                              0,
                                              2
                                            )
                                            .toUpperCase()
                                        : "?"}
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      {developer?.full_name ||
                                        "Unknown"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {developer?.title ||
                                        developer?.role ||
                                        ""}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-[#050b18] p-4">
                                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                  Registered By
                                </p>

                                <p className="mt-3 text-sm font-semibold text-white">
                                  {submitter?.full_name ||
                                    "Unknown"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {submitter?.title ||
                                    submitter?.role ||
                                    ""}
                                </p>
                              </div>
                            </div>

                            {/* DATES */}
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                  Claimed
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {project.claimed_at
                                    ? new Date(
                                        project.claimed_at
                                      ).toLocaleString()
                                    : "-"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                  Expected Completion
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {project.expected_completion_at
                                    ? new Date(
                                        project.expected_completion_at
                                      ).toLocaleString()
                                    : "Not set"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                  Completed
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {project.completed_at
                                    ? new Date(
                                        project.completed_at
                                      ).toLocaleString()
                                    : "-"}
                                </p>
                              </div>
                            </div>

                            {project.project_note && (
                              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                  Developer Progress Note
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                                  {
                                    project.project_note
                                  }
                                </p>
                              </div>
                            )}

                            {/* ADMIN PRIVATE INFO */}
                            <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]">
                              <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-slate-400 hover:text-white">
                                View Client & Project Details
                              </summary>

                              <div className="border-t border-white/10 p-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <p className="text-[10px] uppercase text-slate-600">
                                      Client Name
                                    </p>

                                    <p className="mt-1 text-sm text-slate-300">
                                      {
                                        project.client_name
                                      }
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[10px] uppercase text-slate-600">
                                      Business
                                    </p>

                                    <p className="mt-1 text-sm text-slate-300">
                                      {project.business_name ||
                                        "Not provided"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[10px] uppercase text-slate-600">
                                      Email
                                    </p>

                                    <p className="mt-1 break-all text-sm text-slate-300">
                                      {project.client_email ||
                                        "Not provided"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[10px] uppercase text-slate-600">
                                      Phone
                                    </p>

                                    <p className="mt-1 text-sm text-slate-300">
                                      {project.client_phone ||
                                        "Not provided"}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <p className="text-[10px] uppercase text-slate-600">
                                    Requirements
                                  </p>

                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                                    {
                                      project.description
                                    }
                                  </p>
                                </div>
                              </div>
                            </details>
                          </article>
                        );
                      }
                    )}
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