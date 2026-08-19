import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import RealtimeRefresh from "@/components/realtime-refresh";
import BdeSidebar from "@/components/bde-sidebar";

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
    <main className="min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="min-h-screen md:flex">

        {/* ====================================================== */}
        {/* SIDEBAR + MOBILE NAV */}
        {/* ====================================================== */}

        <BdeSidebar
          profile={profile}
          activePage="announcements"
        />

        {/* ====================================================== */}
        {/* MAIN */}
        {/* ====================================================== */}

        <section className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">

                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 sm:text-xs">
                  GDS Internal Operations
                </p>

                <h1 className="mt-2 text-2xl font-semibold">
                  Announcements
                </h1>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Internal updates and notices from GDS.
                </p>

              </div>

              <Link
                href="/bde/dashboard"
                className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm text-slate-300 transition hover:bg-white/5 hover:text-white sm:w-auto"
              >
                Back to Dashboard
              </Link>

            </div>

          </header>

          {/* CONTENT */}

          <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">

            {activeAnnouncements.length === 0 ? (

              <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 sm:min-h-[500px]">

                <div className="text-center">

                  <p className="text-sm text-slate-500">
                    No active announcements.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Company updates will appear here.
                  </p>

                </div>

              </div>

            ) : (

              <div className="space-y-4 sm:space-y-5">

                {activeAnnouncements.map((announcement) => (

                  <article
                    key={announcement.id}
                    className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6"
                  >

                    {/* TITLE + BADGE */}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">

                      <div className="min-w-0">

                        <h2 className="break-words text-lg font-semibold text-white sm:text-xl">
                          {announcement.title}
                        </h2>

                        <p className="mt-2 text-[11px] text-slate-600 sm:text-xs">
                          {new Date(
                            announcement.created_at
                          ).toLocaleString()}
                        </p>

                      </div>

                      <span className="self-start rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-medium text-blue-400 sm:text-xs">
                        GDS Announcement
                      </span>

                    </div>

                    {/* MESSAGE */}

                    <p className="mt-5 break-words whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {announcement.message}
                    </p>

                    {/* EXPIRATION */}

                    {announcement.expires_at && (

                      <div className="mt-5 border-t border-white/10 pt-4">

                        <p className="break-words text-[11px] leading-5 text-slate-600 sm:text-xs">
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