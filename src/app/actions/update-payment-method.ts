"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PaymentMethod = "gcash" | "maya" | "bank";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function updatePaymentMethod(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in.",
    };
  }

  const paymentMethod = String(
    formData.get("payment_method") || ""
  ) as PaymentMethod;

  const accountName = String(
    formData.get("payment_account_name") || ""
  ).trim();

  const accountNumber = String(
    formData.get("payment_account_number") || ""
  ).trim();

  const bankName = String(
    formData.get("payment_bank_name") || ""
  ).trim();

  if (!["gcash", "maya", "bank"].includes(paymentMethod)) {
    return {
      success: false,
      message: "Please select a valid payment method.",
    };
  }

  if (!accountName) {
    return {
      success: false,
      message: "Please enter the account name.",
    };
  }

  if (!accountNumber) {
    return {
      success: false,
      message: "Please enter the account number.",
    };
  }

  if (paymentMethod === "bank" && !bankName) {
    return {
      success: false,
      message: "Please enter the bank name.",
    };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return {
      success: false,
      message: "Account not found or inactive.",
    };
  }

  if (
    normalizeName(accountName) !==
    normalizeName(profile.full_name)
  ) {
    return {
      success: false,
      message: `Account name must match your registered name: ${profile.full_name}`,
    };
  }

  if (
    (paymentMethod === "gcash" || paymentMethod === "maya") &&
    !/^\d{11}$/.test(accountNumber)
  ) {
    return {
      success: false,
      message: "GCash and Maya numbers must contain exactly 11 digits.",
    };
  }

  if (
    paymentMethod === "bank" &&
    !/^\d{6,20}$/.test(accountNumber)
  ) {
    return {
      success: false,
      message: "Please enter a valid bank account number.",
    };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      payment_method: paymentMethod,
      payment_account_name: accountName,
      payment_account_number: accountNumber,
      payment_bank_name:
        paymentMethod === "bank" ? bankName : null,
    })
    .eq("id", user.id);

  if (error) {
    console.error(
      "Failed to update payment method:",
      error
    );

    return {
      success: false,
      message: "Failed to save payment details.",
    };
  }

  return {
    success: true,
    message: "Payment method updated successfully.",
  };
}