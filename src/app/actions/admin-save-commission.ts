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

  const commissionRate = 10;

  const status = String(
    formData.get("status") || "approved"
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  if (!commissionId) {
    throw new Error("Commission ID is required.");
  }

  const commissionAmount =
    projectAmount * (commissionRate / 100);

  const { data: existing, error: fetchError } =
    await admin
      .from("commissions")
      .select("paid_amount")
      .eq("id", commissionId)
      .single();

  if (fetchError || !existing) {
    throw new Error("Commission record not found.");
  }

  const currentPaid = Number(
    existing.paid_amount || 0
  );

  let newPaidAmount = currentPaid;

  /*
   * APPROVED
   * No payment is released yet.
   */
  if (status === "approved") {
    newPaidAmount = 0;
  }

  /*
   * PAID
   * Release the next 50% of the total commission.
   *
   * Example:
   * Total commission = ₱2,980
   * First release = ₱1,490
   * Second release = ₱1,490
   */
  if (status === "paid") {
    const halfCommission =
      commissionAmount / 2;

    newPaidAmount = Math.min(
      currentPaid + halfCommission,
      commissionAmount
    );
  }

  const finalStatus =
    newPaidAmount >= commissionAmount
      ? "paid"
      : "approved";

  const updateData: Record<string, unknown> = {
    project_amount: projectAmount,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    paid_amount: newPaidAmount,
    status: finalStatus,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  if (finalStatus === "approved") {
    updateData.approved_at =
      new Date().toISOString();
  }

  if (
    finalStatus === "paid" &&
    newPaidAmount >= commissionAmount
  ) {
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