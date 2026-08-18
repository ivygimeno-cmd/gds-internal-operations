import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUser } from "@/app/actions/create-user";
import RealtimeRefresh from "@/components/realtime-refresh";

export default async function AdministrationPage() {
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

  const { data: users } = await admin
    .from("profiles")
    .select(`
      id,
      username,
      full_name,
      role,
      title,
      specialties,
      is_active,
      created_at
    `)
    .order("created_at", {
      ascending: true,
    });

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
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
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
              User Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create and manage internal GDS accounts.
            </p>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto p-8">
            <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
              {/* CREATE ACCOUNT */}
              <section className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold">
                  Create Account
                </h2>

                <form
                  action={createUser}
                  autoComplete="off"
                  className="mt-7 space-y-5"
                >
                  <input
                    type="text"
                    name="fake_username"
                    autoComplete="username"
                    className="hidden"
                    tabIndex={-1}
                  />

                  <input
                    type="password"
                    name="fake_password"
                    autoComplete="current-password"
                    className="hidden"
                    tabIndex={-1}
                  />

                  <div>
                    <label
                      htmlFor="full_name"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      Full Name
                    </label>

                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      autoComplete="off"
                      placeholder="Enter full name"
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="username"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      GDS Username
                    </label>

                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      autoComplete="off"
                      placeholder="Enter GDS username"
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-slate-600">
                      Example: jcruz.gds
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="title"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      Title / Position
                    </label>

                    <input
                      id="title"
                      name="title"
                      type="text"
                      required
                      autoComplete="off"
                      placeholder="Enter title or position"
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="role"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      System Role
                    </label>

                    <select
                      id="role"
                      name="role"
                      required
                      defaultValue=""
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="" disabled>
                        Select role
                      </option>

                      <option value="admin">
                        Admin
                      </option>

                      <option value="bde">
                        BDE / VA
                      </option>

                      <option value="developer">
                        Developer
                      </option>

                      <option value="graphic_designer">
                        Graphic Designer
                      </option>

                      <option value="staff">
                        Staff
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      Temporary Password
                    </label>

                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Enter temporary password"
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-slate-600">
                      Minimum 8 characters
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Create Account
                  </button>
                </form>
              </section>

              {/* TEAM LIST */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    GDS Team
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {users?.length ?? 0} account(s)
                  </p>
                </div>

                <div className="mt-7 space-y-3">
                  {users?.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#08111f] p-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {member.full_name}
                        </p>

                        <p className="mt-1 truncate text-sm text-slate-400">
                          {member.title || "No title assigned"}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-600">
                          {member.username}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-wide text-blue-400">
                          {member.role}
                        </span>

                        <p
                          className={`mt-2 text-xs ${
                            member.is_active
                              ? "text-green-400"
                              : "text-slate-500"
                          }`}
                        >
                          {member.is_active
                            ? "Active"
                            : "Inactive"}
                        </p>
                      </div>
                    </div>
                  ))}

                  {!users?.length && (
                    <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-white/10">
                      <p className="text-sm text-slate-600">
                        No accounts found.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}