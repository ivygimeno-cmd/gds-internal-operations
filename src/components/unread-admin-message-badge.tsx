"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UnreadAdminMessageBadge() {
  const [hasUnread, setHasUnread] = useState(false);

  const checkUnreadMessages = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setHasUnread(false);
      return;
    }

    const { count, error } = await supabase
      .from("admin_messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error(
        "Failed to check unread admin messages:",
        error
      );
      return;
    }

    setHasUnread((count ?? 0) > 0);
  }, []);

  useEffect(() => {
    checkUnreadMessages();

    const supabase = createClient();

    const channel = supabase
      .channel("unread-admin-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_messages",
        },
        () => {
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkUnreadMessages]);

  if (!hasUnread) {
    return null;
  }

  return (
    <span
      className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
      aria-label="Unread message"
    />
  );
}