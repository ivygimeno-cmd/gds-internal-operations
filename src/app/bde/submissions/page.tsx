import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RealtimeRefresh from "@/components/realtime-refresh";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    waiting: "Waiting",
    claimed: "Claimed",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    waiting: "bg-amber-500/10 text-amber-400",
    claimed: "bg-green-500/10 text-green-400",
    cancelled: "bg-slate-500/10 text-slate-500",
  };

  return classes[status] ?? "bg-white/5 text-slate-400";
}

export default async function BdeSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  const searchQuery = (params.q || "").trim().toLowerCase();
  const activeStatus = params.status || "all";

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
    !["bde", "staff", "admin"].includes(profile.role)
  ) {
    redirect("/");
  }

  let query = admin
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
      created_at,
      claimed_at,
      completed_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (profile.role !== "admin") {
    query = query.eq("submitted_by", user.id);
  }

  const { data: submissions } = await query;

  const allSubmissions = submissions ?? [];

  const filtered = allSubmissions.filter((item) => {
    const matchesStatus =
      activeStatus === "all" ||
      item.status === activeStatus;

    const searchable = [
      item.client_name,
      item.business_name,
      item.project_name,
      item.service_type,
      item.client_email,
      item.client_phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchQuery ||
      searchable.includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  const filters = [
    { label: "All", value: "all" },
    { label: "Waiting", value: "waiting" },
    { label: "Claimed", value: "claimed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <RealtimeRefresh />

      <header className="flex items-center justify-between border-b border-white/10 px-8 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
            GDS Internal Operations
          </p>

          <h1 className="mt-2 text-2xl font-semibold">
            My Client Submissions
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            All clients registered through your account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/bde/register"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            + Register Client
          </Link>

          <Link
            href="/bde/dashboard"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="p-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const href = searchQuery
                  ? `/bde/submissions?status=${filter.value}&q=${encodeURIComponent(
                      searchQuery
                    )}`
                  : `/bde/submissions?status=${filter.value}`;

                return (
                  <Link
                    key={filter.value}
                    href={href}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      activeStatus === filter.value
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
              action="/bde/submissions"
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
                placeholder="Search client or project..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
              />

              <button
                type="submit"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Submissions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filtered.length} record(s)
            </p>
          </div>

          <div className="p-5">
            {filtered.length === 0 ? (
              <div className="flex min-h-[450px] items-center justify-center rounded-xl border border-dashed border-white/10">
                <p className="text-sm text-slate-600">
                  No matching submissions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white">
                          {item.client_name}
                        </h3>

                        {item.business_name && (
                          <p className="mt-1 text-sm text-slate-300">
                            {item.business_name}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-slate-500">
                          {item.project_name}
                        </p>

                        {item.service_type && (
                          <p className="mt-1 text-xs text-slate-600">
                            {item.service_type}
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                          item.status
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                      {item.description}
                    </p>

                    <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-3">
                      <div>
                        <p className="text-[10px] uppercase text-slate-600">
                          Email
                        </p>

                        <p className="mt-1 break-all text-sm text-slate-400">
                          {item.client_email || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase text-slate-600">
                          Phone
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {item.client_phone || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase text-slate-600">
                          Source
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {item.source_platform || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-600">
                      <span>
                        Submitted:{" "}
                        {new Date(item.created_at).toLocaleString()}
                      </span>

                      {item.claimed_at && (
                        <span>
                          Claimed:{" "}
                          {new Date(item.claimed_at).toLocaleString()}
                        </span>
                      )}

                      {item.completed_at && (
                        <span>
                          Completed:{" "}
                          {new Date(item.completed_at).toLocaleString()}
                        </span>
                      )}
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