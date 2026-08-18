import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/actions/logout";
import RealtimeRefresh from "@/components/realtime-refresh";

export default async function BdeAnnouncementsPage() {
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

  const { data: announcements } = await admin
    .from("announcements")
    .select(`
      id,
      title,
      message,
      is_active,
      expires_at,
      created_at
    `)
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  const activeAnnouncements = (announcements ?? []).filter(
    (announcement) => {
      if (!announcement.expires_at) {
        return true;
      }

      return (
        new Date(announcement.expires_at).getTime() >
        new Date().getTime()
      );
    }
  );

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
                href="/bde/leads"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                My Leads
              </Link>

              <Link
                href="/bde/commission"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                My Commission
              </Link>

    

              <Link
                href="/bde/announcements"
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
              >
                Announcements
              </Link>
            </nav>

            <div className="mt-7">
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-[11px] text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Message Admin
              </button>
            </div>
          </div>

          {/* ACCOUNT */}
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
                <p className="text-sm font-semibold text-white">
                  {profile.full_name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
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

        {/* MAIN */}
        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-white/10 px-8 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                GDS Internal Operations
              </p>

              <h1 className="mt-2 text-2xl font-semibold">
                Announcements
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Internal updates and notices from GDS.
              </p>
            </div>

            <Link
              href="/bde/dashboard"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Back to Dashboard
            </Link>
          </header>

          <div className="mx-auto max-w-5xl p-8">
            {activeAnnouncements.length === 0 ? (
              <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    No active announcements.
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    Company updates will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {activeAnnouncements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          {announcement.title}
                        </h2>

                        <p className="mt-2 text-xs text-slate-600">
                          {new Date(
                            announcement.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                        GDS Announcement
                      </span>
                    </div>

                    <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {announcement.message}
                    </p>

                    {announcement.expires_at && (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-xs text-slate-600">
                          Available until:{" "}
                          {new Date(
                            announcement.expires_at
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
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