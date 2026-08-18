import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminReplyMessage } from "@/app/actions/admin-reply-message";
import RealtimeRefresh from "@/components/realtime-refresh";
import MarkAdminMessagesRead from "../../../components/mark-admin-messages-read";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    user?: string;
  }>;
}) {
  const params = await searchParams;

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
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    profile.role !== "admin"
  ) {
    redirect("/");
  }

  const { data: allMessages } = await admin
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
      `sender_id.eq.${user.id},receiver_id.eq.${user.id}`
    )
    .order("created_at", {
      ascending: false,
    });

  const conversationUserIds = Array.from(
    new Set(
      (allMessages ?? [])
        .flatMap((item) => [
          item.sender_id,
          item.receiver_id,
        ])
        .filter((id) => id !== user.id)
    )
  );

  let people: {
    id: string;
    full_name: string;
    username: string;
    role: string;
    title: string | null;
    profile_picture_url: string | null;
  }[] = [];

  if (conversationUserIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        role,
        title,
        profile_picture_url
      `)
      .in("id", conversationUserIds);

    people = data ?? [];
  }

  const selectedUserId =
    params.user ||
    people[0]?.id ||
    "";

  const selectedPerson =
    people.find(
      (person) =>
        person.id === selectedUserId
    ) ?? null;

  const conversation = (allMessages ?? [])
    .filter(
      (item) =>
        (item.sender_id === user.id &&
          item.receiver_id ===
            selectedUserId) ||
        (item.sender_id ===
          selectedUserId &&
          item.receiver_id === user.id)
    )
    .reverse();

  return (
  <main className="h-screen overflow-hidden bg-[#050b18] text-white">
    <RealtimeRefresh />

    <header className="flex h-[110px] items-center justify-between border-b border-white/10 px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
            GDS Internal Operations
          </p>

          <h1 className="mt-2 text-2xl font-semibold">
            Messages
          </h1>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
        >
          Back to Dashboard
        </Link>
      </header>

      <div className="grid h-[calc(100vh-110px)] grid-cols-[340px_1fr]">
        <aside className="border-r border-white/10 bg-[#07111f]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold">
              Conversations
            </h2>
          </div>

          <div className="h-[calc(100%-65px)] overflow-y-auto p-4">
            {people.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">
                No messages yet.
              </p>
            ) : (
              <div className="space-y-2">
                {people.map((person) => (
                  <Link
                    key={person.id}
                    href={`/admin/messages?user=${person.id}`}
                    className={`flex items-center gap-3 rounded-xl p-3 ${
                      person.id ===
                      selectedUserId
                        ? "bg-blue-600"
                        : "bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    {person.profile_picture_url ? (
                      <img
                        src={
                          person.profile_picture_url
                        }
                        alt={person.full_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-xs">
                        {person.full_name
                          .split(" ")
                          .map(
                            (part: string) =>
                              part[0]
                          )
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {person.full_name}
                      </p>

                      <p
                        className={`mt-1 truncate text-xs ${
                          person.id ===
                          selectedUserId
                            ? "text-blue-100"
                            : "text-slate-500"
                        }`}
                      >
                        {person.title ||
                          person.role}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {!selectedPerson ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-slate-600">
                Select a conversation.
              </p>
            </div>
          ) : (
  <>
    <MarkAdminMessagesRead
      otherUserId={selectedPerson.id}
    />

    <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
                <p className="font-semibold">
                  {selectedPerson.full_name}
                </p>

                <span className="text-xs text-slate-500">
                  {selectedPerson.title ||
                    selectedPerson.role}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {conversation.map((item) => {
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
                              ? "bg-blue-600"
                              : "border border-white/10 bg-[#08111f]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6">
                            {item.message}
                          </p>

                          <p className="mt-2 text-[10px] text-slate-300/60">
                            {new Date(
                              item.created_at
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form
                action={adminReplyMessage}
                className="border-t border-white/10 p-5"
              >
                <input
                  type="hidden"
                  name="receiver_id"
                  value={selectedPerson.id}
                />

                <div className="flex gap-3">
                  <textarea
                    name="message"
                    required
                    rows={2}
                    placeholder="Reply..."
                    className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm outline-none placeholder:text-slate-600"
                  />

                  <button
                    type="submit"
                    className="self-end rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}