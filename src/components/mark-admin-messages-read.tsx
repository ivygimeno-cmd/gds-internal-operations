"use client";

import { useEffect } from "react";
import { markAdminMessagesRead } from "@/app/actions/mark-admin-messages-read";

type Props = {
  otherUserId: string;
};

export default function MarkAdminMessagesRead({
  otherUserId,
}: Props) {
  useEffect(() => {
    if (!otherUserId) return;

    markAdminMessagesRead(otherUserId).catch((error) => {
      console.error(
        "Failed to mark messages as read:",
        error
      );
    });
  }, [otherUserId]);

  return null;
}