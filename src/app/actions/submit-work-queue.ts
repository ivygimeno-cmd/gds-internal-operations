"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function submitWorkQueue(
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

  const allowedRoles = [
    "admin",
    "bde",
    "staff",
    "developer",
    "graphic_designer",
  ];

  if (!allowedRoles.includes(profile.role)) {
    throw new Error(
      "Your account does not have permission to register a client."
    );
  }

  const clientName = String(
    formData.get("client_name") || ""
  ).trim();

  const businessName = String(
    formData.get("business_name") || ""
  ).trim();

  const projectName = String(
    formData.get("project_name") || ""
  ).trim();

  const serviceType = String(
    formData.get("service_type") || ""
  ).trim();

  const description = String(
    formData.get("description") || ""
  ).trim();

  const clientEmail = String(
    formData.get("client_email") || ""
  )
    .trim()
    .toLowerCase();

  const clientPhone = String(
    formData.get("client_phone") || ""
  ).trim();

  const sourcePlatform = String(
    formData.get("source_platform") || ""
  ).trim();

  if (!clientName) {
    throw new Error("Client name is required.");
  }

  if (!projectName) {
    throw new Error("Project name is required.");
  }

  if (!description) {
    throw new Error("Project description is required.");
  }

  const { error } = await admin
    .from("work_queue")
    .insert({
      client_name: clientName,
      business_name: businessName || null,
      project_name: projectName,
      service_type: serviceType || null,
      description,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      source_platform: sourcePlatform || null,
      submitted_by: user.id,
      status: "waiting",
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/bde/dashboard");
  revalidatePath("/developer/dashboard");
  revalidatePath("/admin/dashboard");

  if (profile.role === "bde" || profile.role === "staff") {
    redirect("/bde/dashboard");
  }

  if (
    profile.role === "developer" ||
    profile.role === "graphic_designer"
  ) {
    redirect("/developer/dashboard");
  }

  if (profile.role === "admin") {
    redirect("/developer/dashboard");
  }

  redirect("/");
}