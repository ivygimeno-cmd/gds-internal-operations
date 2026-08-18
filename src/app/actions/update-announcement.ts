"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateAnnouncement(
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

  const announcementId = String(
    formData.get("announcement_id") || ""
  ).trim();

  const isActive =
    String(formData.get("is_active") || "") === "true";

  if (!announcementId) {
    throw new Error("Announcement ID is required.");
  }

  const { error } = await admin
    .from("announcements")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/bde/announcements");
  revalidatePath("/developer/dashboard");
}