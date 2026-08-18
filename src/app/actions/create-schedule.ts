"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createSchedule(
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

  const allowedRoles = [
    "admin",
    "bde",
    "staff",
    "developer",
    "graphic_designer",
  ];

  if (!allowedRoles.includes(profile.role)) {
    throw new Error(
      "You do not have permission to create schedules."
    );
  }

  const title = String(
    formData.get("title") || ""
  ).trim();

  const description = String(
    formData.get("description") || ""
  ).trim();

  const eventType = String(
    formData.get("event_type") || "task"
  ).trim();

  const startsAt = String(
    formData.get("starts_at") || ""
  ).trim();

  const endsAt = String(
    formData.get("ends_at") || ""
  ).trim();

  const requestedAssignedTo = String(
    formData.get("assigned_to") || ""
  ).trim();

  const isCompanyEvent =
    profile.role === "admin" &&
    String(
      formData.get("is_company_event") || ""
    ) === "true";

  if (!title) {
    throw new Error("Schedule title is required.");
  }

  if (!startsAt) {
    throw new Error("Start date and time are required.");
  }

  let assignedTo: string | null = user.id;

  if (profile.role === "admin") {
    if (requestedAssignedTo === "everyone") {
      assignedTo = null;
    } else if (requestedAssignedTo) {
      assignedTo = requestedAssignedTo;
    }
  }

  const { error } = await admin
    .from("schedules")
    .insert({
      created_by: user.id,
      assigned_to: assignedTo,
      title,
      description: description || null,
      event_type: eventType,
      starts_at: new Date(
        startsAt
      ).toISOString(),
      ends_at: endsAt
        ? new Date(endsAt).toISOString()
        : null,
      is_company_event: isCompanyEvent,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bde/schedule");
  revalidatePath("/admin/schedule");
}