"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function adminCreateCommission(
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

  const userId = String(
    formData.get("user_id") || ""
  ).trim();

  const clientName = String(
    formData.get("client_name") || ""
  ).trim();

  const projectName = String(
    formData.get("project_name") || ""
  ).trim();

  const projectAmount = Number(
    formData.get("project_amount") || 0
  );

  const commissionRate = Number(
    formData.get("commission_rate") || 0
  );

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  if (!userId) {
    throw new Error("Select a BDE/VA.");
  }

  if (!clientName) {
    throw new Error("Client name is required.");
  }

  if (!projectName) {
    throw new Error("Project name is required.");
  }

  const commissionAmount =
    projectAmount * (commissionRate / 100);

  const { error } = await admin
    .from("commissions")
    .insert({
      user_id: userId,
      client_name: clientName,
      project_name: projectName,
      project_amount: projectAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: "pending",
      notes: notes || null,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/commissions");
  revalidatePath("/bde/commission");
}