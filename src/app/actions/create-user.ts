"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createUser(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    throw new Error("Unauthorized.");
  }

  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (
    !currentProfile ||
    currentProfile.role !== "admin" ||
    !currentProfile.is_active
  ) {
    throw new Error("Unauthorized.");
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");
  const title = String(formData.get("title") || "").trim();

  if (!fullName || !username || !password || !role || !title) {
    throw new Error("Complete all required fields.");
  }

  if (!username.endsWith(".gds")) {
    throw new Error("Username must end in .gds");
  }

  const allowedRoles = [
  "admin",
  "bde",
  "developer",
  "graphic_designer",
  "staff",
];

  if (!allowedRoles.includes(role)) {
    throw new Error("Invalid role.");
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    throw new Error("Username already exists.");
  }

  const emailBase = username.replace(".gds", "");
  const internalEmail = `${emailBase}@gds.internal`;

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Could not create account.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    username,
    full_name: fullName,
    auth_email: internalEmail,
    role,
    title,
    specialties: [],
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/administration");
}