import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnnouncement } from "@/app/actions/create-announcement";
import { updateAnnouncement } from "@/app/actions/update-announcement";
import RealtimeRefresh from "@/components/realtime-refresh";

export default async function AdminAnnouncementsPage() {
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
    profile.role !== "admin"
  ) {
    redirect("/");
  }

  const { data: announcements } = await admin
    .from("announcements")
    .select(`
      id,
      title,
      message,
      is_active,
      expires_at,
      created_at,
      updated_at
    `)
    .order("created_at", {
      ascending: false,
    });

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
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/developer/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                My Production Dashboard
              </Link>

              <Link
                href="/bde/register"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Register Referral
              </Link>

         

              <Link
                href="/admin/projects"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Projects
              </Link>

              <Link
                href="/admin/team"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Team
              </Link>

          

              <Link
                href="/admin/commissions"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Commissions
              </Link>

              <Link
                href="/admin/announcements"
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
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
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Management
              </Link>

              <Link
                href="/admin/administration"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Administration
              </Link>
            </nav>
          </div>

          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
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

              <div>
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
          <header className="border-b border-white/10 px-8 py-6">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
              GDS Internal Operations
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              Announcements
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Publish company notices and internal updates.
            </p>
          </header>

          <div className="grid gap-6 p-8 xl:grid-cols-[420px_1fr]">
            {/* CREATE ANNOUNCEMENT */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">
                Create Announcement
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                This will appear in the Announcements page of the team.
              </p>

              <form
                action={createAnnouncement}
                className="mt-6 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Subject *
                  </label>

                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="Example: Team Meeting Reminder"
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Body *
                  </label>

                  <textarea
                    name="message"
                    required
                    rows={9}
                    placeholder="Write your announcement here..."
                    className="w-full resize-y rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Expiration
                  </label>

                  <input
                    name="expires_at"
                    type="datetime-local"
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />

                  <p className="mt-2 text-xs text-slate-600">
                    Optional. Leave blank if the announcement should stay
                    active until you deactivate it.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Publish Announcement
                </button>
              </form>
            </section>

            {/* ANNOUNCEMENT HISTORY */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-lg font-semibold">
                  Published Announcements
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {announcements?.length ?? 0} announcement(s)
                </p>
              </div>

              <div className="max-h-[760px] overflow-y-auto p-5">
                {!announcements || announcements.length === 0 ? (
                  <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-white/10">
                    <p className="text-sm text-slate-600">
                      No announcements yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <article
                        key={announcement.id}
                        className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-white">
                              {announcement.title}
                            </h3>

                            <p className="mt-2 text-xs text-slate-600">
                              {new Date(
                                announcement.created_at
                              ).toLocaleString()}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                              announcement.is_active
                                ? "bg-green-500/10 text-green-400"
                                : "bg-slate-500/10 text-slate-500"
                            }`}
                          >
                            {announcement.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                          {announcement.message}
                        </p>

                        {announcement.expires_at && (
                          <div className="mt-4 rounded-xl bg-white/[0.02] p-3">
                            <p className="text-xs text-slate-600">
                              Expires:{" "}
                              {new Date(
                                announcement.expires_at
                              ).toLocaleString()}
                            </p>
                          </div>
                        )}

                        <form
                          action={updateAnnouncement}
                          className="mt-5 border-t border-white/10 pt-4"
                        >
                          <input
                            type="hidden"
                            name="announcement_id"
                            value={announcement.id}
                          />

                          <input
                            type="hidden"
                            name="is_active"
                            value={
                              announcement.is_active
                                ? "false"
                                : "true"
                            }
                          />

                          <button
                            type="submit"
                            className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                          >
                            {announcement.is_active
                              ? "Deactivate Announcement"
                              : "Activate Announcement"}
                          </button>
                        </form>
                      </article>
                    ))}
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