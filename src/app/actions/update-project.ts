"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProject(
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
      is_active
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
    throw new Error("Unauthorized.");
  }

  const projectId = String(
    formData.get("project_id") || ""
  ).trim();

  const projectStatus = String(
    formData.get("project_status") || "in_progress"
  ).trim();

  const expectedCompletionAt = String(
    formData.get("expected_completion_at") || ""
  ).trim();

  const projectNote = String(
    formData.get("project_note") || ""
  ).trim();

  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  const allowedStatuses = [
    "in_progress",
    "waiting_client",
    "revision",
    "testing",
    "completed",
  ];

  if (!allowedStatuses.includes(projectStatus)) {
    throw new Error("Invalid project status.");
  }

  let projectQuery = admin
    .from("work_queue")
    .select(`
      id,
      claimed_by,
      status,
      project_status
    `)
    .eq("id", projectId)
    .eq("status", "claimed");

  if (profile.role !== "admin") {
    projectQuery = projectQuery.eq(
      "claimed_by",
      user.id
    );
  }

  const { data: existingProject } =
    await projectQuery.maybeSingle();

  if (!existingProject) {
    throw new Error(
      "Project not found or you do not have access."
    );
  }

  const ownerId =
    existingProject.claimed_by;

  if (!ownerId) {
    throw new Error(
      "This project does not have an assigned production member."
    );
  }

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    project_status: projectStatus,

    expected_completion_at:
      expectedCompletionAt
        ? new Date(
            expectedCompletionAt
          ).toISOString()
        : null,

    project_note:
      projectNote || null,

    updated_at: now,
  };

  if (projectStatus === "completed") {
    updateData.completed_at = now;
  } else {
    updateData.completed_at = null;
  }

  let updateQuery = admin
    .from("work_queue")
    .update(updateData)
    .eq("id", projectId)
    .eq("status", "claimed");

  if (profile.role !== "admin") {
    updateQuery = updateQuery.eq(
      "claimed_by",
      user.id
    );
  }

  const { error } = await updateQuery;

  if (error) {
    throw new Error(error.message);
  }

  /*
   * AUTO UPDATE EMPLOYEE STATUS
   *
   * If project is still active:
   * employee becomes WORKING.
   *
   * If project is completed:
   * check if employee has another active project.
   * If none -> AVAILABLE.
   * If yes -> WORKING.
   */

  if (projectStatus !== "completed") {
    await admin
      .from("profiles")
      .update({
        availability_status: "working",
        availability_note:
          "Currently working on a project.",
      })
      .eq("id", ownerId);
  } else {
    const { data: otherProjects } =
      await admin
        .from("work_queue")
        .select(`
          id,
          project_status
        `)
        .eq("claimed_by", ownerId)
        .eq("status", "claimed")
        .neq("id", projectId)
        .neq(
          "project_status",
          "completed"
        );

    const stillHasActiveProjects =
      (otherProjects?.length ?? 0) > 0;

    if (stillHasActiveProjects) {
      await admin
        .from("profiles")
        .update({
          availability_status: "working",
          availability_note:
            "Currently working on another project.",
        })
        .eq("id", ownerId);
    } else {
      await admin
        .from("profiles")
        .update({
          availability_status: "available",
          available_again_at: null,
          availability_note: null,
        })
        .eq("id", ownerId);
    }
  }

  revalidatePath(
    "/developer/dashboard"
  );

  revalidatePath(
    "/developer/projects"
  );

  revalidatePath(
    "/developer/queue"
  );

  revalidatePath(
    "/admin/dashboard"
  );

  revalidatePath(
    "/admin/projects"
  );

  revalidatePath(
    "/bde/dashboard"
  );

  revalidatePath(
    "/bde/queue"
  );

  revalidatePath(
    "/bde/submissions"
  );
}