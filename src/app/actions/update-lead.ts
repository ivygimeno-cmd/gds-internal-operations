"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateLead(
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

  if (!["bde", "staff", "admin"].includes(profile.role)) {
    throw new Error("You do not have permission to update leads.");
  }

  const leadId = String(
    formData.get("lead_id") || ""
  ).trim();

  const status = String(
    formData.get("status") || ""
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  const nextFollowUpAt = String(
    formData.get("next_follow_up_at") || ""
  ).trim();

  if (!leadId) {
    throw new Error("Lead ID is required.");
  }

  let query = admin
    .from("leads")
    .update({
      status,
      notes: notes || null,
      next_follow_up_at: nextFollowUpAt
        ? new Date(nextFollowUpAt).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (profile.role !== "admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bde/leads");
  revalidatePath("/bde/follow-ups");
}