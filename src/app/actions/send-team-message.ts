"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendTeamMessage(
  formData: FormData
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const message = String(
    formData.get("message") || ""
  ).trim();

  if (!message) {
    throw new Error("Message is required.");
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    throw new Error("Unauthorized.");
  }

  const { error } = await admin
    .from("team_messages")
    .insert({
      sender_id: user.id,
      message,
      is_read: false,
    });

  if (error) {
    throw new Error(error.message);
  }
}