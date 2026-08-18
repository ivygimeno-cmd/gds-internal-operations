"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendAdminMessage(
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

  const { data: sender } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!sender || !sender.is_active) {
    throw new Error("Unauthorized.");
  }

  const message = String(
    formData.get("message") || ""
  ).trim();

  if (!message) {
    throw new Error("Message is required.");
  }

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (!adminProfile) {
    throw new Error("No active admin account found.");
  }

  const { error } = await admin
    .from("admin_messages")
    .insert({
      sender_id: user.id,
      receiver_id: adminProfile.id,
      message,
      is_read: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bde/message-admin");
  revalidatePath("/admin/messages");
}