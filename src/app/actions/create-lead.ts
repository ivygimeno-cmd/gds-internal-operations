"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createLead(
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

  if (
    !["bde", "staff", "admin"].includes(
      profile.role
    )
  ) {
    throw new Error(
      "You do not have permission to create leads."
    );
  }

  const clientName = String(
    formData.get("client_name") || ""
  ).trim();

  const businessName = String(
    formData.get("business_name") || ""
  ).trim();

  const email = String(
    formData.get("email") || ""
  )
    .trim()
    .toLowerCase();

  const phone = String(
    formData.get("phone") || ""
  ).trim();

  const sourcePlatform = String(
    formData.get("source_platform") || ""
  ).trim();

  const status = String(
    formData.get("status") || "new"
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  const nextFollowUpAt = String(
    formData.get("next_follow_up_at") || ""
  ).trim();

  if (!clientName) {
    throw new Error(
      "Client name is required."
    );
  }

  const { error } = await admin
    .from("leads")
    .insert({
      created_by: user.id,
      client_name: clientName,
      business_name:
        businessName || null,
      email: email || null,
      phone: phone || null,
      source_platform:
        sourcePlatform || null,
      status,
      notes: notes || null,
      next_follow_up_at:
        nextFollowUpAt
          ? new Date(
              nextFollowUpAt
            ).toISOString()
          : null,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bde/leads");
}