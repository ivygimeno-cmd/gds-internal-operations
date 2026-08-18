"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markAdminMessagesRead(
  otherUserId: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (!otherUserId) {
    return;
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

  const { error } = await admin
    .from("admin_messages")
    .update({
      is_read: true,
    })
    .eq("receiver_id", user.id)
    .eq("sender_id", otherUserId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/messages");
  revalidatePath("/bde/message-admin");
}