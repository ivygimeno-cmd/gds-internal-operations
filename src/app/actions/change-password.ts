"use server";

import { createClient } from "@/lib/supabase/server";

export async function changePassword(
  formData: FormData
): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in to change your password.",
    };
  }

  const currentPassword = String(
    formData.get("current_password") || ""
  );

  const newPassword = String(
    formData.get("new_password") || ""
  );

  const confirmPassword = String(
    formData.get("confirm_password") || ""
  );

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      error: "Please complete all password fields.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "New passwords do not match.",
    };
  }

  if (newPassword.length < 8) {
    return {
      error: "New password must be at least 8 characters.",
    };
  }

  if (currentPassword === newPassword) {
    return {
      error: "Your new password must be different from your current password.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Current password is incorrect."
          : error.message,
    };
  }

  return {
    success: "Password changed successfully.",
  };
}