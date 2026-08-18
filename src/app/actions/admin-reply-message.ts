"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function adminReplyMessage(
  formData: FormData
): Promise<void> {
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
    throw new Error("Unauthorized.");
  }

  const receiverId = String(
    formData.get("receiver_id") || ""
  ).trim();

  const message = String(
    formData.get("message") || ""
  ).trim();

  if (!receiverId) {
    throw new Error("Receiver is required.");
  }

  if (!message) {
    throw new Error("Message is required.");
  }

  const { error } = await admin
    .from("admin_messages")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      message,
      is_read: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/messages");
  revalidatePath("/bde/message-admin");
}