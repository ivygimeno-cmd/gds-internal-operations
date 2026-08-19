"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { sendTeamMessage } from "@/app/actions/send-team-message";
import { deleteTeamMessage } from "@/app/actions/delete-team-message";

type Profile = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  title: string | null;
  profile_picture_url: string | null;
};

type TeamMessage = {
  id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type Props = {
  currentUser: Profile;
  teamMembers: Profile[];
  initialMessages: TeamMessage[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayName(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length <= 1) {
    return parts[0] || "Team Member";
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  return `${firstName} ${lastName.charAt(0)}.`;
}

export default function TeamChat({
  currentUser,
  teamMembers,
  initialMessages,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] =
    useState<TeamMessage[]>(initialMessages);

  const [messageText, setMessageText] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [unreadCount, setUnreadCount] =
    useState(
      initialMessages.filter(
        (message) =>
          message.sender_id !== currentUser.id &&
          !message.is_read
      ).length
    );

  const chatRef =
    useRef<HTMLDivElement>(null);

  const messagesRef =
    useRef<HTMLDivElement>(null);

  const supabase = useMemo(
    () => createClient(),
    []
  );

  /*
   * REALTIME TEAM CHAT
   */
  useEffect(() => {
    const channel = supabase
      .channel(
        `gds-team-chat-${currentUser.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
        },
        (payload) => {
          const newMessage =
            payload.new as TeamMessage;

          setMessages((current) => {
            if (
              current.some(
                (message) =>
                  message.id ===
                  newMessage.id
              )
            ) {
              return current;
            }

            return [
              ...current,
              newMessage,
            ];
          });

          if (
            newMessage.sender_id !==
            currentUser.id
          ) {
            if (!isOpen) {
              setUnreadCount(
                (count) => count + 1
              );
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_messages",
        },
        (payload) => {
          const deletedMessage =
            payload.old as {
              id?: string;
            };

          if (!deletedMessage.id) {
            return;
          }

          setMessages((current) =>
            current.filter(
              (message) =>
                message.id !==
                deletedMessage.id
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
    isOpen,
  ]);

  /*
   * CLICK OUTSIDE = MINIMIZE
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        chatRef.current &&
        !chatRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [isOpen]);

  /*
   * MARK MESSAGES AS READ
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const unreadMessages =
      messages.filter(
        (message) =>
          message.sender_id !==
            currentUser.id &&
          !message.is_read
      );

    if (
      unreadMessages.length === 0
    ) {
      setUnreadCount(0);
      return;
    }

    async function markAsRead() {
      const messageIds =
        unreadMessages.map(
          (message) => message.id
        );

      const now =
        new Date().toISOString();

      const rows =
        messageIds.map(
          (messageId) => ({
            message_id: messageId,
            user_id: currentUser.id,
            read_at: now,
          })
        );

      const { error } =
        await supabase
          .from("team_message_reads")
          .upsert(rows, {
            onConflict:
              "message_id,user_id",
          });

      if (error) {
        console.error(
          "Failed to mark team messages as read:",
          error
        );
        return;
      }

      setUnreadCount(0);
    }

    markAsRead();
  }, [
    isOpen,
    messages,
    currentUser.id,
    supabase,
  ]);

  /*
   * AUTO SCROLL
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const element =
      messagesRef.current;

    if (element) {
      element.scrollTop =
        element.scrollHeight;
    }
  }, [
    isOpen,
    messages.length,
  ]);

  /*
   * DELETE OWN MESSAGE
   */
  async function handleDeleteMessage(
    messageId: string
  ) {
    const formData =
      new FormData();

    formData.append(
      "message_id",
      messageId
    );

    try {
      await deleteTeamMessage(
        formData
      );

      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== messageId
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete team message:",
        error
      );
    }
  }

  /*
   * SEND MESSAGE
   */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text =
      messageText.trim();

    if (!text || sending) {
      return;
    }

    setSending(true);

    const formData =
      new FormData();

    formData.append(
      "message",
      text
    );

    try {
      await sendTeamMessage(
        formData
      );

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
   * MINIMIZED CHAT BUTTON
   */
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() =>
          setIsOpen(true)
        }
        aria-label="Open Team Chat"
        className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition hover:scale-105 hover:bg-blue-500"
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
      className="fixed bottom-6 right-6 z-[9999] flex h-[600px] w-[430px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl"
    >
      {/* HEADER */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">
            Team Chat
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            GDS Internal Team
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsOpen(false)
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Minimize Team Chat"
        >
          −
        </button>
      </div>

      {/* TEAM MEMBERS */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex -space-x-2">
          {teamMembers
            .slice(0, 6)
            .map((member) =>
              member.profile_picture_url ? (
                <img
                  key={member.id}
                  src={
                    member.profile_picture_url
                  }
                  alt={member.full_name}
                  className="h-8 w-8 rounded-full border-2 border-[#07111f] object-cover"
                />
              ) : (
                <div
                  key={member.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#07111f] bg-white/10 text-[9px] font-semibold"
                >
                  {getInitials(
                    member.full_name
                  )}
                </div>
              )
            )}
        </div>

        <p className="ml-2 text-xs text-slate-500">
          {teamMembers.length} team members
        </p>
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesRef}
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-slate-400">
                No messages yet.
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Start the team conversation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(
              (message) => {
                const mine =
                  message.sender_id ===
                  currentUser.id;

                const sender =
                  teamMembers.find(
                    (member) =>
                      member.id ===
                      message.sender_id
                  );

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div className="max-w-[82%]">
                      {!mine && (
                        <p className="mb-1 ml-1 text-[10px] font-semibold text-slate-500">
                          {sender
  ? getDisplayName(sender.full_name)
  : "Team Member"}
                        </p>
                      )}

                      <div
                        className={`group relative rounded-2xl px-4 py-2.5 ${
                          mine
                            ? "bg-blue-600 text-white"
                            : "border border-white/10 bg-[#0a1525] text-slate-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-5">
                          {message.message}
                        </p>

                        {mine && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMessage(
                                message.id
                              )
                            }
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#07111f] text-[10px] leading-none text-slate-500 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                            aria-label="Delete message"
                            title="Delete"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <p
                        className={`mt-1 text-[9px] text-slate-600 ${
                          mine
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {new Date(
                          message.created_at
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* COMPOSER */}
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
          placeholder="Message the team..."
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
          {sending
            ? "..."
            : "Send"}
        </button>
      </form>
    </div>
  );
}