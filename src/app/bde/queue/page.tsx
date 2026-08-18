import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimWork } from "@/app/actions/claim-work";
import RealtimeRefresh from "@/components/realtime-refresh";

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

function maskEmail(email: string | null) {
  if (!email) {
    return null;
  }

  const [local, domain] = email.trim().split("@");

  if (!local || !domain) {
    return "Private email";
  }

  const visible =
    local.length >= 3
      ? local.slice(0, 3)
      : local.slice(0, 1);

  return `${visible}****@${domain}`;
}

function maskPhone(phone: string | null) {
  if (!phone) {
    return null;
  }

  const cleaned = phone.replace(/\s+/g, "");

  if (cleaned.length <= 4) {
    return "****";
  }

  return `${cleaned.slice(0, 2)}*****${cleaned.slice(-4)}`;
}

export default async function DeveloperQueuePage({
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
    !["admin", "developer", "graphic_designer"].includes(
      profile.role
    )
  ) {
    redirect("/");
  }

  const { data: queueItems } = await admin
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
      created_at
    `)
    .eq("status", "waiting")
    .order("created_at", {
      ascending: true,
    });

  const filteredQueue = (queueItems ?? []).filter(
    (item) => {
      if (!searchQuery) {
        return true;
      }

      const searchable = [
        item.client_name,
        item.business_name,
        item.project_name,
        item.service_type,
        item.client_email,
        item.client_phone,
        item.source_platform,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(searchQuery);
    }
  );

  return (
    <main className="h-screen overflow-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />

      <div className="flex h-screen">
        {/* SIDEBAR */}
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
                className="block rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white"
              >
                Work Queue
              </Link>

              <Link
                href="/developer/projects"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
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

        {/* MAIN */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[135px] shrink-0 items-center justify-between border-b border-white/10 px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                Production Dashboard
              </p>

              <h1 className="mt-2 text-2xl font-semibold">
                Work Queue
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Available client work ready to claim.
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
                href="/developer/dashboard"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-8">
            {/* SEARCH */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <form
                action="/developer/queue"
                method="get"
                className="flex gap-3"
              >
                <input
                  name="q"
                  type="search"
                  defaultValue={params.q || ""}
                  placeholder="Search client, business or service..."
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Search
                </button>
              </form>
            </section>

            {/* COUNT */}
            <div className="mt-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Available Projects
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredQueue.length} project(s) waiting
                </p>
              </div>
            </div>

            {/* QUEUE */}
            <section className="mt-5">
              {filteredQueue.length === 0 ? (
                <div className="flex min-h-[450px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                  <div className="text-center">
                    <p className="text-sm text-slate-500">
                      No work waiting in the queue.
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                      New client projects will appear here automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  {filteredQueue.map((item) => {
                    const safeEmail = maskEmail(
                      item.client_email
                    );

                    const safePhone = maskPhone(
                      item.client_phone
                    );

                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">
                              {maskName(item.client_name)}
                            </h2>

                            <p className="mt-1 text-sm text-slate-300">
                              {item.business_name ||
                                item.project_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.project_name}
                            </p>

                            {item.service_type && (
                              <p className="mt-1 text-xs text-slate-600">
                                {item.service_type}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                            Waiting
                          </span>
                        </div>

                        {/* REQUIREMENTS */}
                        <div className="mt-5 rounded-xl border border-white/10 bg-[#08111f] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            Project Requirements
                          </p>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        {/* MASKED CONTACT */}
                        {(safeEmail || safePhone) && (
                          <div className="mt-4 rounded-xl border border-white/10 bg-[#08111f] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                              Client Preview
                            </p>

                            {safeEmail && (
                              <p className="mt-2 break-all text-xs text-slate-400">
                                Email: {safeEmail}
                              </p>
                            )}

                            {safePhone && (
                              <p className="mt-1 text-xs text-slate-400">
                                Phone: {safePhone}
                              </p>
                            )}
                          </div>
                        )}

                        <p className="mt-4 text-xs text-slate-600">
                          Submitted:{" "}
                          {new Date(
                            item.created_at
                          ).toLocaleString()}
                        </p>

                        <form
                          action={claimWork}
                          className="mt-5"
                        >
                          <input
                            type="hidden"
                            name="work_id"
                            value={item.id}
                          />

                          <button
                            type="submit"
                            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                          >
                            Claim Project
                          </button>
                        </form>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}