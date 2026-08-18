"use client";

import { useState } from "react";
import { updatePaymentMethod } from "@/app/actions/update-payment-method";

type PaymentMethod = "gcash" | "maya" | "bank";

type Props = {
  fullName: string;
  paymentMethod: PaymentMethod | null;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
};

const methodLabels: Record<PaymentMethod, string> = {
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank Account",
};

export default function PaymentMethodForm({
  fullName,
  paymentMethod,
  accountName,
  accountNumber,
  bankName,
}: Props) {
  const [editing, setEditing] = useState(!paymentMethod);
  const [method, setMethod] = useState<PaymentMethod>(
    paymentMethod || "gcash"
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);

    const result = await updatePaymentMethod(formData);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setEditing(false);

    window.location.reload();
  }

  if (!editing && paymentMethod) {
    return (
      <div className="mt-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Current Payment Method
              </p>

              <p className="mt-2 text-lg font-semibold">
                {methodLabels[paymentMethod]}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Edit
            </button>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div>
              <p className="text-slate-500">
                Account Name
              </p>

              <p className="mt-1 text-white">
                {accountName}
              </p>
            </div>

            {paymentMethod === "bank" && (
              <div>
                <p className="text-slate-500">
                  Bank
                </p>

                <p className="mt-1 text-white">
                  {bankName}
                </p>
              </div>
            )}

            <div>
              <p className="text-slate-500">
                {paymentMethod === "bank"
                  ? "Account Number"
                  : `${methodLabels[paymentMethod]} Number`}
              </p>

              <p className="mt-1 text-white">
                {accountNumber}
              </p>
            </div>
          </div>
        </div>

        {message && (
          <p className="mt-3 text-sm text-green-400">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-5"
    >
      <div>
        <label className="text-sm text-slate-300">
          Payment Method
        </label>

        <select
          name="payment_method"
          value={method}
          onChange={(event) =>
            setMethod(event.target.value as PaymentMethod)
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
        >
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="bank">Bank Account</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-slate-300">
          Account Name
        </label>

        <input
          name="payment_account_name"
          type="text"
          defaultValue={accountName || fullName}
          placeholder={fullName}
          required
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />

        <p className="mt-2 text-xs text-slate-500">
          Must exactly match your registered account name:
          {" "}
          <span className="text-slate-400">
            {fullName}
          </span>
        </p>
      </div>

      {method === "bank" && (
        <div>
          <label className="text-sm text-slate-300">
            Bank Name
          </label>

          <input
            name="payment_bank_name"
            type="text"
            defaultValue={bankName || ""}
            placeholder="e.g. BDO, BPI, Metrobank"
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>
      )}

      <div>
        <label className="text-sm text-slate-300">
          {method === "bank"
            ? "Bank Account Number"
            : `${methodLabels[method]} Number`}
        </label>

        <input
          name="payment_account_number"
          type="text"
          inputMode="numeric"
          defaultValue={accountNumber || ""}
          placeholder={
            method === "bank"
              ? "Enter your bank account number"
              : "09XXXXXXXXX"
          }
          required
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Save Payment Method
        </button>

        {paymentMethod && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setEditing(false);
            }}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}