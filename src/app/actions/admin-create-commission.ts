"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COMMISSION_RATE = 15;

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

  const workQueueId = String(
    formData.get("work_queue_id") || ""
  ).trim();

  const projectAmount = Number(
    formData.get("project_amount") || 0
  );

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  if (!workQueueId) {
    throw new Error("Select a claimed project.");
  }

  if (projectAmount <= 0) {
    throw new Error(
      "Project amount must be greater than 0."
    );
  }

  const { data: project } = await admin
    .from("work_queue")
    .select(`
      id,
      client_name,
      business_name,
      project_name,
      submitted_by,
      status,
      project_status
    `)
    .eq("id", workQueueId)
    .eq("status", "claimed")
    .maybeSingle();

  if (!project) {
    throw new Error(
      "Selected project is not currently claimed."
    );
  }

  if (project.project_status === "completed") {
    throw new Error(
      "A completed project cannot receive a new commission."
    );
  }

  if (!project.submitted_by) {
    throw new Error(
      "This project does not have a registered BDE/VA."
    );
  }

  const clientName =
    project.business_name ||
    project.client_name;

  const projectName =
    project.project_name;

  if (!clientName) {
    throw new Error(
      "The selected project does not have a client name."
    );
  }

  if (!projectName) {
    throw new Error(
      "The selected project does not have a project name."
    );
  }

  // Prevent duplicate commission records for the same project.
  const { data: existingCommission } = await admin
    .from("commissions")
    .select("id, status")
    .eq("work_queue_id", project.id)
    .maybeSingle();

  if (existingCommission) {
    throw new Error(
      `A commission already exists for this project (${existingCommission.status}).`
    );
  }

  const commissionAmount =
    projectAmount * (COMMISSION_RATE / 100);

  const { error } = await admin
    .from("commissions")
    .insert({
      user_id: project.submitted_by,
      work_queue_id: project.id,
      client_name: clientName,
      project_name: projectName,
      project_amount: projectAmount,
      commission_rate: COMMISSION_RATE,
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