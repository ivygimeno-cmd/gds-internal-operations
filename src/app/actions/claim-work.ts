"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function claimWork(
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
    .select(`
      id,
      role,
      is_active,
      availability_status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    !["admin", "developer", "graphic_designer"].includes(
      profile.role
    )
  ) {
    throw new Error(
      "You do not have permission to claim projects."
    );
  }

  const workId = String(
    formData.get("work_id") || ""
  ).trim();

  if (!workId) {
    throw new Error("Project ID is required.");
  }

  const { data: currentWork } = await admin
    .from("work_queue")
    .select(`
      id,
      status,
      claimed_by
    `)
    .eq("id", workId)
    .maybeSingle();

  if (!currentWork) {
    throw new Error(
      "This project no longer exists."
    );
  }

  if (
    currentWork.status !== "waiting" ||
    currentWork.claimed_by
  ) {
    throw new Error(
      "This project has already been claimed."
    );
  }

  const now = new Date().toISOString();

  const { data: claimedProject, error } =
    await admin
      .from("work_queue")
      .update({
        status: "claimed",
        claimed_by: user.id,
        claimed_at: now,
        project_status: "in_progress",
        completed_at: null,
      })
      .eq("id", workId)
      .eq("status", "waiting")
      .is("claimed_by", null)
      .select(`
        id,
        claimed_by,
        status
      `)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!claimedProject) {
    throw new Error(
      "Someone else claimed this project first."
    );
  }

  await admin
    .from("profiles")
    .update({
      availability_status: "working",
      availability_note:
        "Currently working on a project.",
    })
    .eq("id", user.id);

  revalidatePath("/developer/dashboard");
  revalidatePath("/developer/queue");
  revalidatePath("/developer/projects");

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/projects");

  revalidatePath("/bde/dashboard");
  revalidatePath("/bde/queue");
  revalidatePath("/bde/submissions");

  redirect("/developer/projects");
}