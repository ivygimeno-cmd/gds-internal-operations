"use server";

import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function login(
  previousState: { error: string },
  formData: FormData
) {
  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return {
      error: "Username and password are required.",
    };
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("auth_email, role, is_active")
    .eq("username", username)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      error: "Invalid username or password.",
    };
  }

  if (!profile.is_active) {
    return {
      error: "This account is inactive. Contact GDS Administration.",
    };
  }

  const supabase = await createServerClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.auth_email,
    password,
  });

  if (signInError) {
    return {
      error: "Invalid username or password.",
    };
  }

if (profile.role === "admin") {
  redirect("/admin/dashboard");
}

if (
  profile.role === "developer" ||
  profile.role === "graphic_designer"
) {
  redirect("/developer/dashboard");
}

if (profile.role === "staff") {
  redirect("/staff/dashboard");
}

if (profile.role === "bde") {
  redirect("/bde/dashboard");
}

return {
  error: "This account does not have dashboard access.",
};
  return {
    error: "This account does not have access yet.",
  };
}