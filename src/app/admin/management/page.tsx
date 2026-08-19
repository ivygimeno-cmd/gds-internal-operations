import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RealtimeRefresh from "@/components/realtime-refresh";

function availabilityLabel(status: string | null) {
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

  if (!status) return "";

  return labels[status] ?? status;
}

function availabilityClass(status: string | null) {
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

  if (!status) {
    return "bg-white/5 text-slate-400";
  }

  return classes[status] ?? "bg-white/5 text-slate-400";
}

function roleRank(role: string, title: string | null) {
  const normalizedTitle = (title || "").toLowerCase();

  if (
    normalizedTitle.includes("ceo") ||
    normalizedTitle.includes("founder")
  ) {
    return 1;
  }

  if (
    normalizedTitle.includes("lead developer") ||
    normalizedTitle.includes("lead dev")
  ) {
    return 2;
  }

  if (role === "developer") {
    return 3;
  }

  if (role === "graphic_designer") {
    return 4;
  }

  if (role === "bde") {
    return 5;
  }

  if (role === "staff") {
    return 6;
  }

  if (role === "admin") {
    return 7;
  }

  return 99;
}

function isProductionRole(role: string) {
  return [
    "admin",
    "developer",
    "graphic_designer",
  ].includes(role);
}

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const searchQuery = (params.q || "")
    .trim()
    .toLowerCase();

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

 const { data: employees } = await admin
  .from("profiles")
  .select(`
    id,
    username,
    full_name,
    role,
    title,
    is_active,
    profile_picture_url,
    availability_status,
    available_again_at,
    availability_note,
    created_at
  `);

const { data: authUsers } =
  await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

const lastSignInMap = new Map(
  (authUsers.users ?? []).map((authUser) => [
    authUser.id,
    authUser.last_sign_in_at,
  ])
);

const employeesWithLastLogin =
  (employees ?? []).map((employee) => ({
    ...employee,
    last_sign_in_at:
      lastSignInMap.get(employee.id) ?? null,
  }));

 const sortedEmployees = [
  ...employeesWithLastLogin,
].sort((a, b) => {
    const rankA = roleRank(
      a.role,
      a.title
    );

    const rankB = roleRank(
      b.role,
      b.title
    );

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return a.full_name.localeCompare(
      b.full_name,
      "en",
      {
        sensitivity: "base",
      }
    );
  });

  const filteredEmployees =
    sortedEmployees.filter((employee) => {
      if (!searchQuery) {
        return true;
      }

      const searchable = [
        employee.full_name,
        employee.username,
        employee.role,
        employee.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(
        searchQuery
      );
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
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
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
              Employee Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage employee accounts, roles, profile information and work status.
            </p>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto p-8">
            {/* SEARCH */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <form
                action="/admin/management"
                method="get"
                className="flex gap-3"
              >
                <input
                  name="q"
                  type="search"
                  defaultValue={params.q || ""}
                  placeholder="Search employee by name, username, role or position..."
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Search
                </button>

                {searchQuery && (
                  <Link
                    href="/admin/management"
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    Clear
                  </Link>
                )}
              </form>
            </div>

            {/* EMPLOYEES */}
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredEmployees.map(
                (employee) => {
                  const productionEmployee =
                    isProductionRole(
                      employee.role
                    );

                  return (
                    <div
                      key={employee.id}
                      className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                    >
                      <div className="flex items-start gap-4">
                        {employee.profile_picture_url ? (
                          <img
                            src={
                              employee.profile_picture_url
                            }
                            alt={
                              employee.full_name
                            }
                            className="h-16 w-16 shrink-0 rounded-full border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-slate-400">
                            {employee.full_name
                              .split(" ")
                              .map(
                                (
                                  part: string
                                ) => part[0]
                              )
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h2 className="text-lg font-semibold">
                                {employee.full_name}
                              </h2>

                              <p className="mt-1 text-sm text-slate-400">
                                {employee.title ||
                                  "No title assigned"}
                              </p>

                              <p className="mt-1 text-xs text-slate-600">
                                {employee.username}
                              </p>
                            </div>

                            {productionEmployee &&
                              employee.availability_status && (
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${availabilityClass(
                                    employee.availability_status
                                  )}`}
                                >
                                  {availabilityLabel(
                                    employee.availability_status
                                  )}
                                </span>
                              )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-wide text-blue-400">
                              {employee.role}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                employee.is_active
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-slate-500/10 text-slate-500"
                              }`}
                            >
                              {employee.is_active
                                ? "Active Account"
                                : "Inactive Account"}
                            </span>
                          </div>
<div className="mt-4">
  <p className="text-xs text-slate-600">
    Last login
  </p>

  <p className="mt-1 text-xs text-slate-400">
    {employee.last_sign_in_at
      ? new Date(
          employee.last_sign_in_at
        ).toLocaleString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Never logged in"}
  </p>
</div>
                          {productionEmployee &&
                            employee.available_again_at && (
                              <p className="mt-4 text-xs text-slate-500">
                                Available again:{" "}
                                {new Date(
                                  employee.available_again_at
                                ).toLocaleString()}
                              </p>
                            )}

                          {productionEmployee &&
                            employee.availability_note && (
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {employee.availability_note}
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="mt-auto border-t border-white/10 pt-5">
                        <Link
                          href={`/admin/management/${employee.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          Manage Employee
                        </Link>
                      </div>
                    </div>
                  );
                }
              )}

              {!filteredEmployees.length && (
                <div className="col-span-full flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-white/10">
                  <p className="text-sm text-slate-600">
                    No employee accounts found.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}