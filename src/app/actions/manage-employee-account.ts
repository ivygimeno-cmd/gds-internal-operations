"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    throw new Error("Unauthorized.");
  }

  return admin;
}

export async function updateEmployeeProfile(
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employee_id") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase();
  const title = String(formData.get("title") || "").trim();
  const role = String(formData.get("role") || "");

  const allowedRoles = [
    "admin",
    "bde",
    "developer",
    "graphic_designer",
    "staff",
  ];

  if (
    !employeeId ||
    !fullName ||
    !username ||
    !title ||
    !allowedRoles.includes(role)
  ) {
    throw new Error("Invalid profile update.");
  }

  if (!username.endsWith(".gds")) {
    throw new Error("Username must end in .gds");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      username,
      title,
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/management/${employeeId}`);
  revalidatePath("/admin/management");
  revalidatePath("/admin/dashboard");
  revalidatePath("/developer/dashboard");
}

export async function changeEmployeePassword(
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employee_id") || "");
  const newPassword = String(formData.get("new_password") || "");

  if (!employeeId || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { error } = await admin.auth.admin.updateUserById(
    employeeId,
    {
      password: newPassword,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function suspendEmployee(
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employee_id") || "");

  if (!employeeId) {
    throw new Error("Invalid employee.");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      is_active: false,
      availability_status: "offline",
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/management/${employeeId}`);
  revalidatePath("/admin/management");
  revalidatePath("/admin/dashboard");
  revalidatePath("/developer/dashboard");
}

export async function reactivateEmployee(
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employee_id") || "");

  if (!employeeId) {
    throw new Error("Invalid employee.");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      is_active: true,
      availability_status: "available",
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/management/${employeeId}`);
  revalidatePath("/admin/management");
  revalidatePath("/admin/dashboard");
  revalidatePath("/developer/dashboard");
}

export async function updateEmployeeAdminNotes(
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();

  const employeeId = String(
    formData.get("employee_id") || ""
  ).trim();

  const adminNotes = String(
    formData.get("admin_notes") || ""
  ).trim();

  if (!employeeId) {
    throw new Error("Invalid employee.");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/management/${employeeId}`);
  revalidatePath("/admin/management");
}