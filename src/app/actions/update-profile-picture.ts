"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfilePicture(
  formData: FormData
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !currentProfile ||
    !currentProfile.is_active ||
    currentProfile.role !== "admin"
  ) {
    throw new Error("Unauthorized.");
  }

  const employeeId = String(
    formData.get("employee_id") || ""
  );

  const file = formData.get("profile_picture");

  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please select an image.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  // 5 MB maximum
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const extension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "webp",
  ];

  if (!allowedExtensions.includes(extension)) {
    throw new Error(
      "Only JPG, JPEG, PNG and WebP images are allowed."
    );
  }

  const filePath = `${employeeId}/profile.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from("profile-pictures")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = admin.storage
    .from("profile-pictures")
    .getPublicUrl(filePath);

  // cache busting para makita agad bagong photo
  const profilePictureUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      profile_picture_url: profilePictureUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath(`/admin/management/${employeeId}`);
  revalidatePath("/admin/management");
  revalidatePath("/admin/dashboard");
  revalidatePath("/developer/dashboard");
}