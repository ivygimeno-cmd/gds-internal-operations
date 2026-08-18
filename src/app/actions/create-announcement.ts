"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createAnnouncement(
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
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    profile.role !== "admin"
  ) {
    throw new Error("Unauthorized.");
  }

  const title = String(
    formData.get("title") || ""
  ).trim();

  const message = String(
    formData.get("message") || ""
  ).trim();

  const expiresAt = String(
    formData.get("expires_at") || ""
  ).trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!message) {
    throw new Error("Message is required.");
  }

  const { error } = await admin
    .from("announcements")
    .insert({
      title,
      message,
      created_by: user.id,
      is_active: true,
      expires_at: expiresAt
        ? new Date(expiresAt).toISOString()
        : null,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/bde/announcements");
  revalidatePath("/developer/dashboard");
}