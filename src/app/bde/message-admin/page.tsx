import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import BdeSidebar from "@/components/bde-sidebar";
import { sendAdminMessage } from "@/app/actions/send-admin-message";
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

      {/* IMPORTANT:
          flex-col on mobile
          flex-row from md and above
      */}
      <div className="flex h-screen flex-col md:flex-row">

        {/* ====================================================== */}
        {/* SIDEBAR */}
        {/* ====================================================== */}

        <BdeSidebar
          profile={profile}
          activePage="message-admin"
        />

        {/* ====================================================== */}
        {/* MAIN */}
        {/* ====================================================== */}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">

          {/* HEADER */}

          <header className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">

                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 sm:text-xs">
                  GDS Internal Operations
                </p>

                <h1 className="mt-2 text-xl font-semibold sm:text-2xl">
                  Message Admin
                </h1>

                <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                  Private conversation with{" "}
                  {adminProfile.full_name}.
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

          {/* ====================================================== */}
          {/* CHAT */}
          {/* ====================================================== */}

          <div className="min-h-0 flex-1 p-3 sm:p-5 lg:p-8">

            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">

              {/* ADMIN HEADER */}

              <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">

                {adminProfile.profile_picture_url ? (
                  <img
                    src={adminProfile.profile_picture_url}
                    alt={adminProfile.full_name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs text-slate-400 sm:h-11 sm:w-11">
                    {adminProfile.full_name
                      .split(" ")
                      .map(
                        (part: string) => part[0]
                      )
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold sm:text-base">
                    {adminProfile.full_name}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                    Admin
                  </p>

                </div>

              </div>

              {/* MARK MESSAGES READ */}

              <MarkAdminMessagesRead
                otherUserId={adminProfile.id}
              />

              {/* MESSAGES */}

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">

                {!messages || messages.length === 0 ? (

                  <div className="flex h-full min-h-[250px] items-center justify-center">

                    <div className="px-5 text-center">

                      <p className="text-sm text-slate-500">
                        No messages yet.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Send a message to contact the admin.
                      </p>

                    </div>

                  </div>

                ) : (

                  <div className="space-y-3 sm:space-y-4">

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
                            className={`max-w-[88%] break-words rounded-2xl px-3.5 py-2.5 sm:max-w-[70%] sm:px-4 sm:py-3 ${
                              mine
                                ? "bg-blue-600 text-white"
                                : "border border-white/10 bg-[#08111f] text-slate-200"
                            }`}
                          >

                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {item.message}
                            </p>

                            <p
                              className={`mt-2 text-[9px] sm:text-[10px] ${
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

              {/* MESSAGE FORM */}

              <form
                action={sendAdminMessage}
                className="shrink-0 border-t border-white/10 p-3 sm:p-5"
              >

                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">

                  <textarea
                    name="message"
                    required
                    rows={2}
                    placeholder="Write a message..."
                    className="min-h-[52px] min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 sm:w-auto sm:self-end"
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