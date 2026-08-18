"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    let refreshTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    const refreshPage = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        router.refresh();
      }, 150);
    };

    const tables = [
      "profiles",
      "work_queue",
      "leads",
      "commissions",
      "announcements",
      "admin_messages",
    ];

    const channels = tables.map((table) =>
      supabase
        .channel(`gds-${table}-realtime`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          refreshPage
        )
        .subscribe()
    );

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [router]);

  return null;
}