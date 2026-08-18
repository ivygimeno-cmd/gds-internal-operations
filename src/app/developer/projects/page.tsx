import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateProject } from "@/app/actions/update-project";
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

export default async function DeveloperProjectsPage() {
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
    !["admin", "developer", "graphic_designer"].includes(profile.role)
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
      status,
      project_status,
      expected_completion_at,
      project_note,
      completed_at,
      claimed_at,
      created_at
    `)
    .eq("claimed_by", user.id)
    .eq("status", "claimed")
    .order("claimed_at", {
      ascending: false,
    });

  return (
    <main className="h-screen overflow-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex h-screen">
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
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
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
                href="/developer/queue"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Work Queue
              </Link>

              <Link
                href="/developer/projects"
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
              >
                My Projects
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
                <p className="truncate text-sm font-semibold">
                  {profile.full_name}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {profile.username}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[135px] shrink-0 items-center justify-between border-b border-white/10 px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                Production Dashboard
              </p>

              <h1 className="mt-2 text-2xl font-semibold">
                My Projects
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Projects currently assigned to you.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {profile.role === "admin" && (
                <Link
                  href="/admin/dashboard"
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Admin Dashboard
                </Link>
              )}

              <Link
                href="/developer/queue"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Work Queue
              </Link>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-8">
            {!projects || projects.length === 0 ? (
              <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    No projects assigned yet.
                  </p>

                  <Link
                    href="/developer/queue"
                    className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Open Work Queue
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          {project.business_name || project.client_name}
                        </h2>

                        <p className="mt-1 text-sm text-slate-300">
                          {project.project_name}
                        </p>

                        {project.service_type && (
                          <p className="mt-1 text-xs text-slate-500">
                            {project.service_type}
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${projectStatusClass(
                          project.project_status
                        )}`}
                      >
                        {projectStatusLabel(project.project_status)}
                      </span>
                    </div>

                    <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="space-y-5">
                        <section className="rounded-xl border border-white/10 bg-[#08111f] p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Project Requirements
                          </p>

                          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                            {project.description}
                          </p>
                        </section>

                        <section className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                            Private Client Contact
                          </p>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                Client Name
                              </p>

                              <p className="mt-1 text-sm text-slate-300">
                                {project.client_name}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                Business
                              </p>

                              <p className="mt-1 text-sm text-slate-300">
                                {project.business_name || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                Email
                              </p>

                              <p className="mt-1 break-all text-sm text-slate-300">
                                {project.client_email || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                Phone
                              </p>

                              <p className="mt-1 text-sm text-slate-300">
                                {project.client_phone || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                Source
                              </p>

                              <p className="mt-1 text-sm text-slate-300">
                                {project.source_platform || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-600">
                                Claimed
                              </p>

                              <p className="mt-1 text-sm text-slate-300">
                                {project.claimed_at
                                  ? new Date(
                                      project.claimed_at
                                    ).toLocaleString()
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </section>
                      </div>

                      <section className="h-fit rounded-xl border border-white/10 bg-[#08111f] p-5">
                        <h3 className="text-base font-semibold">
                          Project Status
                        </h3>

                        <form
                          action={updateProject}
                          className="mt-5 space-y-4"
                        >
                          <input
                            type="hidden"
                            name="project_id"
                            value={project.id}
                          />

                          <div>
                            <label className="mb-2 block text-xs text-slate-500">
                              Status
                            </label>

                            <select
                              name="project_status"
                              defaultValue={
                                project.project_status || "in_progress"
                              }
                              className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                            >
                              <option value="in_progress">
                                In Progress
                              </option>

                              <option value="waiting_client">
                                Waiting for Client
                              </option>

                              <option value="revision">
                                Revision
                              </option>

                              <option value="testing">
                                Testing
                              </option>

                              <option value="completed">
                                Completed
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs text-slate-500">
                              Expected Completion
                            </label>

                            <input
                              type="datetime-local"
                              name="expected_completion_at"
                              defaultValue={
                                project.expected_completion_at
                                  ? new Date(
                                      project.expected_completion_at
                                    )
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              className="w-full rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs text-slate-500">
                              Progress Note
                            </label>

                            <textarea
                              name="project_note"
                              rows={5}
                              defaultValue={project.project_note ?? ""}
                              placeholder="Add project progress..."
                              className="w-full resize-none rounded-xl border border-white/10 bg-[#050b18] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                          >
                            Update Project
                          </button>
                        </form>

                        {project.completed_at && (
                          <div className="mt-4 rounded-xl bg-green-500/[0.05] p-3">
                            <p className="text-xs text-green-400">
                              Completed:{" "}
                              {new Date(
                                project.completed_at
                              ).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </section>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}