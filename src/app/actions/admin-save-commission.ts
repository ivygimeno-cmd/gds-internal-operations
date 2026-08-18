"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function adminSaveCommission(
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

  const commissionId = String(
    formData.get("commission_id") || ""
  ).trim();

  const projectAmount = Number(
    formData.get("project_amount") || 0
  );

  const commissionRate = Number(
    formData.get("commission_rate") || 0
  );

  const status = String(
    formData.get("status") || "pending"
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  const commissionAmount =
    projectAmount * (commissionRate / 100);

  const updateData: Record<string, unknown> = {
    project_amount: projectAmount,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    status,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved") {
    updateData.approved_at =
      new Date().toISOString();
  }

  if (status === "paid") {
    updateData.paid_at =
      new Date().toISOString();
  }

  const { error } = await admin
    .from("commissions")
    .update(updateData)
    .eq("id", commissionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/commissions");
  revalidatePath("/bde/commission");
}