import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RealtimeRefresh from "@/components/realtime-refresh";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function personCard(person: {
  id: string;
  full_name: string;
  title: string | null;
  role: string;
  profile_picture_url: string | null;
}) {
  return (
    <div
      key={person.id}
      className="min-w-[220px] rounded-2xl border border-white/10 bg-[#08111f] p-5 text-center"
    >
      {person.profile_picture_url ? (
        <img
          src={person.profile_picture_url}
          alt={person.full_name}
          className="mx-auto h-16 w-16 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-slate-400">
          {initials(person.full_name)}
        </div>
      )}

      <h3 className="mt-4 text-base font-semibold text-white">
        {person.full_name}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-400">
        {person.title || person.role}
      </p>
    </div>
  );
}

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select(`
      id,
      username,
      full_name,
      role,
      is_active
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !currentProfile ||
    !currentProfile.is_active ||
    currentProfile.role !== "admin"
  ) {
    redirect("/");
  }

  const { data: people } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      title,
      profile_picture_url,
      is_active
    `)
    .eq("is_active", true)
    .order("full_name", {
      ascending: true,
    });

  const allPeople = people ?? [];

  const founder =
    allPeople.find((person) => {
      const title = (person.title || "").toLowerCase();

      return (
        title.includes("founder") ||
        title.includes("ceo")
      );
    }) ?? null;

  const leadDeveloper =
    allPeople.find((person) =>
      (person.title || "")
        .toLowerCase()
        .includes("lead developer")
    ) ?? null;

  const hrPeople = allPeople.filter((person) => {
    const title = (person.title || "").toLowerCase();

    return (
      title.includes("human resources") ||
      title === "hr" ||
      title.includes("human resource")
    );
  });

  const developers = allPeople
    .filter((person) => {
      if (person.id === founder?.id) return false;
      if (person.id === leadDeveloper?.id) return false;

      return person.role === "developer";
    })
    .sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );

  const graphicDesigners = allPeople
    .filter(
      (person) =>
        person.role === "graphic_designer"
    )
    .sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );

  const bdePeople = allPeople
    .filter(
      (person) =>
        person.role === "bde" ||
        person.role === "staff"
    )
    .sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );

  return (
    <div className="h-screen overflow-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex h-screen">
        {/* SIDEBAR */}
        <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6">
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
                href="/bde/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                BDE Dashboard
              </Link>

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
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
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
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Messages
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

          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="text-sm font-medium">
                {currentProfile.full_name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {currentProfile.username}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wide text-blue-400">
                Admin
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-white/10 px-8 py-6">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
              GDS Internal Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Team Structure
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Organizational structure of Gimeno Design Solutions.
            </p>
          </header>

          <section className="min-h-0 flex-1 overflow-auto p-8">
            <div className="mx-auto min-w-[1050px] max-w-[1450px]">
              {/* FOUNDER */}
              {founder && (
                <div className="flex justify-center">
                  <div className="relative">
                    {personCard(founder)}

                    <div className="absolute left-1/2 top-full h-12 w-px -translate-x-1/2 bg-white/20" />
                  </div>
                </div>
              )}

              {/* MAIN BRANCH LINE */}
              <div className="mx-auto mt-12 h-px w-[66%] bg-white/20" />

              {/* LEADERSHIP BRANCHES */}
              <div className="grid grid-cols-2 gap-20">
                {/* PRODUCTION */}
                <div className="relative flex flex-col items-center">
                  <div className="h-10 w-px bg-white/20" />

                  <div className="rounded-full border border-blue-500/30 bg-blue-500/[0.08] px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
                    Production / Development
                  </div>

                  {leadDeveloper && (
                    <>
                      <div className="h-8 w-px bg-white/20" />

                      {personCard(leadDeveloper)}
                    </>
                  )}

                  {developers.length > 0 && (
                    <>
                      <div className="h-8 w-px bg-white/20" />

                      <div className="h-px w-[72%] bg-white/20" />

                      <div className="grid w-full grid-cols-2 gap-5 pt-8">
                        {developers.map((person) =>
                          personCard(person)
                        )}
                      </div>
                    </>
                  )}

                  {graphicDesigners.length > 0 && (
                    <>
                      <div className="mt-8 h-8 w-px bg-white/20" />

                      <div className="rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                        Graphic Design
                      </div>

                      <div className="mt-6 grid w-full grid-cols-2 gap-5">
                        {graphicDesigners.map((person) =>
                          personCard(person)
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* OPERATIONS */}
                <div className="relative flex flex-col items-center">
                  <div className="h-10 w-px bg-white/20" />

                  <div className="rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                    People & Business Operations
                  </div>

                  {hrPeople.length > 0 && (
                    <>
                      <div className="h-8 w-px bg-white/20" />

                      <div className="grid w-full grid-cols-2 gap-5">
                        {hrPeople.map((person) =>
                          personCard(person)
                        )}
                      </div>
                    </>
                  )}

                  {bdePeople.length > 0 && (
                    <>
                      <div className="mt-8 h-8 w-px bg-white/20" />

                      <div className="rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                        Business Development
                      </div>

                      <div className="mt-6 grid w-full grid-cols-2 gap-5">
                        {bdePeople.map((person) =>
                          personCard(person)
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}