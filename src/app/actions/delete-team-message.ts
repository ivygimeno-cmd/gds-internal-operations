"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteTeamMessage(
  formData: FormData
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const messageId = String(
    formData.get("message_id") || ""
  ).trim();

  if (!messageId) {
    throw new Error("Message ID is required.");
  }

  const admin = createAdminClient();

  const { data: message } = await admin
    .from("team_messages")
    .select("id, sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    throw new Error("Message not found.");
  }

  // Users can ONLY delete messages they personally sent.
  if (message.sender_id !== user.id) {
    throw new Error(
      "You can only delete your own messages."
    );
  }

  const { error } = await admin
    .from("team_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}