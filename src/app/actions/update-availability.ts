"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateAvailability(
  formData: FormData
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized.");
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
    !["developer", "graphic_designer", "admin"].includes(profile.role)
  ) {
    throw new Error("Unauthorized.");
  }

  const status = String(formData.get("availability_status") || "");
  const availableAgain = String(
    formData.get("available_again_at") || ""
  ).trim();

  const note = String(
    formData.get("availability_note") || ""
  ).trim();

  const allowedStatuses = [
    "available",
    "working",
    "limited",
    "fully_booked",
    "meeting",
    "break",
    "leave",
    "offline",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid availability status.");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      availability_status: status,
      available_again_at: availableAgain
        ? new Date(availableAgain).toISOString()
        : null,
      availability_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/developer/dashboard");
}