"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendTeamMessage } from "@/app/actions/send-team-message";

type Person = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  title: string | null;
  profile_picture_url: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type Props = {
  currentUser: Person;
  teammates: Person[];
  initialMessages: Message[];
  initialUnreadCount: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamChatWindow({
  currentUser,
  teammates,
  initialMessages,
  initialUnreadCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    teammates[0]?.id ?? ""
  );

  const [messages, setMessages] =
    useState<Message[]>(initialMessages);

  const [unreadCount, setUnreadCount] =
    useState(initialUnreadCount);

  const [messageText, setMessageText] =
    useState("");

  const [sending, setSending] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const selectedPerson =
    teammates.find(
      (person) => person.id === selectedUserId
    ) ?? null;

  const conversation = useMemo(() => {
    if (!selectedUserId) {
      return [];
    }

    return messages.filter(
      (message) =>
        (message.sender_id === currentUser.id &&
          message.receiver_id === selectedUserId) ||
        (message.sender_id === selectedUserId &&
          message.receiver_id === currentUser.id)
    );
  }, [
    messages,
    selectedUserId,
    currentUser.id,
  ]);

  /*
   * REALTIME
   */
  useEffect(() => {
    const channel = supabase
      .channel(`team-chat-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
        },
        (payload) => {
          const newMessage =
            payload.new as Message;

          const belongsToUser =
            newMessage.sender_id === currentUser.id ||
            newMessage.receiver_id === currentUser.id;

          if (!belongsToUser) {
            return;
          }

          setMessages((current) => {
            if (
              current.some(
                (item) =>
                  item.id === newMessage.id
              )
            ) {
              return current;
            }

            return [...current, newMessage];
          });

          if (
            newMessage.receiver_id ===
              currentUser.id &&
            newMessage.sender_id !== selectedUserId
          ) {
            setUnreadCount((count) => count + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_messages",
        },
        (payload) => {
          const updatedMessage =
            payload.new as Message;

          setMessages((current) =>
            current.map((message) =>
              message.id === updatedMessage.id
                ? updatedMessage
                : message
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    currentUser.id,
    selectedUserId,
  ]);

  /*
   * CLICK OUTSIDE = MINIMIZE
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        chatRef.current &&
        !chatRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [open]);

  /*
   * MARK SELECTED CONVERSATION AS READ
   */
  useEffect(() => {
    if (!open || !selectedUserId) {
      return;
    }

    const unreadMessages = messages.filter(
      (message) =>
        message.sender_id === selectedUserId &&
        message.receiver_id === currentUser.id &&
        !message.is_read
    );

    if (unreadMessages.length === 0) {
      return;
    }

    const markAsRead = async () => {
      const ids = unreadMessages.map(
        (message) => message.id
      );

      const { error } = await supabase
        .from("team_messages")
        .update({
          is_read: true,
        })
        .in("id", ids);

      if (!error) {
        setMessages((current) =>
          current.map((message) =>
            ids.includes(message.id)
              ? {
                  ...message,
                  is_read: true,
                }
              : message
          )
        );

        setUnreadCount((count) =>
          Math.max(
            0,
            count - unreadMessages.length
          )
        );
      }
    };

    markAsRead();
  }, [
    open,
    selectedUserId,
    currentUser.id,
    messages,
    supabase,
  ]);

  /*
   * SCROLL TO BOTTOM
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const element =
      document.getElementById(
        "team-chat-messages"
      );

    if (element) {
      element.scrollTop =
        element.scrollHeight;
    }
  }, [
    open,
    selectedUserId,
    conversation.length,
  ]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text = messageText.trim();

    if (!text || !selectedUserId || sending) {
      return;
    }

    setSending(true);

    const formData = new FormData();

    formData.append(
      "receiver_id",
      selectedUserId
    );

    formData.append(
      "message",
      text
    );

    try {
      await sendTeamMessage(formData);
      setMessageText("");
    } catch (error) {
      console.error(
        "Failed to send team message:",
        error
      );
    } finally {
      setSending(false);
    }
  }

  /*
   * MINIMIZED BUTTON
   */
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition hover:scale-105 hover:bg-blue-500"
        aria-label="Open Team Chat"
      >
        <span className="text-xl">
          💬
        </span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#050b18] bg-red-500 px-1.5 text-[11px] font-bold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={chatRef}
      className="fixed bottom-6 right-6 z-[9999] flex h-[620px] w-[420px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl"
    >
      {/* HEADER */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">
            Team Chat
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            Internal team messages
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Minimize Team Chat"
        >
          −
        </button>
      </div>

      {/* PEOPLE */}
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 p-3">
        {teammates.map((person) => {
          const active =
            person.id === selectedUserId;

          const hasUnread = messages.some(
            (message) =>
              message.sender_id === person.id &&
              message.receiver_id ===
                currentUser.id &&
              !message.is_read
          );

          return (
            <button
              key={person.id}
              type="button"
              onClick={() =>
                setSelectedUserId(person.id)
              }
              className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                active
                  ? "bg-blue-600"
                  : "bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              {person.profile_picture_url ? (
                <img
                  src={
                    person.profile_picture_url
                  }
                  alt={person.full_name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold">
                  {initials(
                    person.full_name
                  )}
                </div>
              )}

              <div className="max-w-[110px]">
                <p className="truncate text-xs font-semibold text-white">
                  {person.full_name}
                </p>

                <p
                  className={`truncate text-[10px] ${
                    active
                      ? "text-blue-100"
                      : "text-slate-500"
                  }`}
                >
                  {person.title ||
                    person.role}
                </p>
              </div>

              {hasUnread && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* CURRENT PERSON */}
      {selectedPerson && (
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-3">
          {selectedPerson.profile_picture_url ? (
            <img
              src={
                selectedPerson.profile_picture_url
              }
              alt={selectedPerson.full_name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              {initials(
                selectedPerson.full_name
              )}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {selectedPerson.full_name}
            </p>

            <p className="truncate text-[11px] text-slate-500">
              {selectedPerson.title ||
                selectedPerson.role}
            </p>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div
        id="team-chat-messages"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        {!selectedPerson ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-600">
              No teammates available.
            </p>
          </div>
        ) : conversation.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-slate-400">
                No messages yet.
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Start the conversation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {conversation.map((message) => {
              const mine =
                message.sender_id ===
                currentUser.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    mine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      mine
                        ? "bg-blue-600 text-white"
                        : "border border-white/10 bg-[#0a1525] text-slate-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-5">
                      {message.message}
                    </p>

                    <p
                      className={`mt-1.5 text-[9px] ${
                        mine
                          ? "text-blue-100/70"
                          : "text-slate-600"
                      }`}
                    >
                      {new Date(
                        message.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPOSER */}
      {selectedPerson && (
        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 gap-2 border-t border-white/10 p-3"
        >
          <input
            type="text"
            value={messageText}
            onChange={(event) =>
              setMessageText(
                event.target.value
              )
            }
            placeholder={`Message ${selectedPerson.full_name.split(" ")[0]}...`}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={
              sending ||
              !messageText.trim()
            }
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}