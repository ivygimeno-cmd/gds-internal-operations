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

    markAdminMessagesRead(otherUserId);
  }, [otherUserId]);

  return null;
}