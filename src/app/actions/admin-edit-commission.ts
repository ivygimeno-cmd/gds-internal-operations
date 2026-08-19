"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COMMISSION_RATE = 15;

async function requireAdmin() {
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

  return admin;
}

export async function adminEditCommission(
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();

  const commissionId = String(
    formData.get("commission_id") || ""
  ).trim();

  const projectAmount = Number(
    formData.get("project_amount") || 0
  );

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  if (!commissionId) {
    throw new Error("Commission ID is required.");
  }

  if (projectAmount <= 0) {
    throw new Error(
      "Project amount must be greater than 0."
    );
  }

  /*
   * Get the existing commission.
   *
   * We preserve paid_amount because this edit is only
   * for correcting/updating the commission record.
   */
  const { data: existing, error: fetchError } =
    await admin
      .from("commissions")
      .select(`
        id,
        project_amount,
        commission_rate,
        commission_amount,
        paid_amount,
        status
      `)
      .eq("id", commissionId)
      .maybeSingle();

  if (fetchError || !existing) {
    throw new Error("Commission record not found.");
  }

  const currentPaid = Number(
    existing.paid_amount || 0
  );

  /*
   * Always use the current GDS commission rate.
   */
  const commissionAmount =
    projectAmount * (COMMISSION_RATE / 100);

  /*
   * Never reduce the historical amount already released.
   *
   * Example:
   * Old commission = ₱13,000
   * Already paid    = ₱6,500
   *
   * New commission at 15% = ₱19,500
   * Paid remains           = ₱6,500
   * Remaining              = ₱13,000
   */
  if (currentPaid > commissionAmount) {
    throw new Error(
      `The new commission amount (${commissionAmount.toLocaleString(
        "en-PH",
        {
          style: "currency",
          currency: "PHP",
        }
      )}) cannot be lower than the amount already paid (${currentPaid.toLocaleString(
        "en-PH",
        {
          style: "currency",
          currency: "PHP",
        }
      )}).`
    );
  }

  const finalStatus =
    currentPaid >= commissionAmount
      ? "paid"
      : currentPaid > 0
      ? "approved"
      : existing.status === "cancelled"
      ? "cancelled"
      : "approved";

  const updateData: Record<string, unknown> = {
    project_amount: projectAmount,
    commission_rate: COMMISSION_RATE,
    commission_amount: commissionAmount,
    paid_amount: currentPaid,
    status: finalStatus,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  /*
   * If the commission is fully paid after editing,
   * make sure paid_at is set.
   */
  if (
    finalStatus === "paid" &&
    currentPaid >= commissionAmount
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