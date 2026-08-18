import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminMessage } from "@/app/actions/send-admin-message";
import { logout } from "@/app/actions/logout";
import RealtimeRefresh from "@/components/realtime-refresh";
import MarkAdminMessagesRead from "../../../components/mark-admin-messages-read";

export default async function MessageAdminPage() {
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
      is_active,
      profile_picture_url
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    !["bde", "staff"].includes(profile.role)
  ) {
    redirect("/");
  }

  const { data: adminProfile } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      username,
      profile_picture_url
    `)
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!adminProfile) {
    throw new Error("No active admin account found.");
  }

  const { data: messages } = await admin
    .from("admin_messages")
    .select(`
      id,
      sender_id,
      receiver_id,
      message,
      is_read,
      created_at
    `)
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${adminProfile.id}),and(sender_id.eq.${adminProfile.id},receiver_id.eq.${user.id})`
    )
    .order("created_at", {
      ascending: true,
    });

  return (
    <main className="h-screen overflow-hidden bg-[#050b18] text-white">
      <RealtimeRefresh />


      <div className="flex h-screen">
        {/* SIDEBAR */}
        <aside className="flex h-screen w-[285px] shrink-0 flex-col border-r border-white/10 bg-[#07111f] px-5 py-6">
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
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/bde/register"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Register Client
              </Link>

              <Link
                href="/bde/leads"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                My Leads
              </Link>

              <Link
                href="/bde/commission"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                My Commission
              </Link>

              <Link
                href="/bde/announcements"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Announcements
              </Link>
            </nav>

            <div className="mt-7">
              <Link
                href="/bde/message-admin"
                className="block w-full rounded-xl bg-blue-600 px-3 py-2.5 text-left text-sm text-white"
              >
                Message Admin
              </Link>
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
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

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile.full_name}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {profile.username}
                </p>
              </div>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 px-8 py-6">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
              GDS Internal Operations
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              Message Admin
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Private conversation with {adminProfile.full_name}.
            </p>
          </header>

          <div className="flex min-h-0 flex-1 flex-col p-8">
            <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
                {adminProfile.profile_picture_url ? (
                  <img
                    src={adminProfile.profile_picture_url}
                    alt={adminProfile.full_name}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400">
                    {adminProfile.full_name
                      .split(" ")
                      .map((part: string) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-semibold">
                    {adminProfile.full_name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Admin
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {!messages || messages.length === 0 ? (
                  <div className="flex h-full min-h-[400px] items-center justify-center">
                    <p className="text-sm text-slate-600">
                      No messages yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((item) => {
                      const mine =
                        item.sender_id === user.id;

                      return (
                        <div
                          key={item.id}
                          className={`flex ${
                            mine
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                              mine
                                ? "bg-blue-600 text-white"
                                : "border border-white/10 bg-[#08111f] text-slate-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {item.message}
                            </p>

                            <p
                              className={`mt-2 text-[10px] ${
                                mine
                                  ? "text-blue-200"
                                  : "text-slate-600"
                              }`}
                            >
                              {new Date(
                                item.created_at
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form
                action={sendAdminMessage}
                className="shrink-0 border-t border-white/10 p-5"
              >
                <div className="flex gap-3">
                  <textarea
                    name="message"
                    required
                    rows={2}
                    placeholder="Write a message..."
                    className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="self-end rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Send
                  </button>
                </div>
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}