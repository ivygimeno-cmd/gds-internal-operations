"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteSchedule(
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

  if (!profile || !profile.is_active) {
    throw new Error("Unauthorized.");
  }

  const scheduleId = String(
    formData.get("schedule_id") || ""
  ).trim();

  if (!scheduleId) {
    throw new Error("Schedule ID is required.");
  }

  let query = admin
    .from("schedules")
    .delete()
    .eq("id", scheduleId);

  if (profile.role !== "admin") {
    query = query.eq(
      "created_by",
      user.id
    );
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bde/schedule");
  revalidatePath("/admin/schedule");
}