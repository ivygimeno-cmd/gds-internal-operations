import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateProfilePicture } from "@/app/actions/update-profile-picture";

import { manageEmployeeStatus } from "@/app/actions/manage-employee-status";

import {
  updateEmployeeProfile,
  updateEmployeeAdminNotes,
  changeEmployeePassword,
  suspendEmployee,
  reactivateEmployee,
} from "@/app/actions/manage-employee-account";

export default async function ManageEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !currentProfile ||
    !currentProfile.is_active ||
    currentProfile.role !== "admin"
  ) {
    redirect("/");
  }

  const { data: employee } = await admin
    .from("profiles")
   .select(
  `
  id,
  username,
  full_name,
  role,
  title,
  profile_picture_url,
  availability_status,
  available_again_at,
  availability_note,
  admin_notes,
  is_active
  `
)
    .eq("id", id)
    .maybeSingle();

  if (!employee) {
    redirect("/admin/management");
  }

  const isOwnAccount = employee.id === currentProfile.id;

  return (
    <main className="min-h-screen bg-[#050b18] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
              GDS Internal Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Manage Employee
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage profile, account access and work availability.
            </p>
          </div>

          <Link
            href="/admin/management"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Back to Management
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* LEFT PROFILE CARD */}
          <aside>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col items-center text-center">
                {employee.profile_picture_url ? (
                  <img
                    src={employee.profile_picture_url}
                    alt={employee.full_name}
                    className="h-28 w-28 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-semibold text-slate-400">
                    {employee.full_name
                      .split(" ")
                      .map((part: string) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <h2 className="mt-5 text-xl font-semibold">
                  {employee.full_name}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {employee.title || "No title assigned"}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  {employee.username}
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs uppercase text-blue-400">
                    {employee.role.replaceAll("_", " ")}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      employee.is_active
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {employee.is_active
                      ? "Active Account"
                      : "Inactive Account"}
                  </span>
                </div>

                <div className="mt-6 w-full border-t border-white/10 pt-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Current Work Status
                  </p>

                  <p className="mt-2 text-sm font-medium capitalize text-white">
                    {employee.availability_status?.replaceAll(
                      "_",
                      " "
                    ) || "Offline"}
                  </p>

                  {employee.availability_note && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {employee.availability_note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT CONTROLS */}
          <section className="space-y-6">
            {/* EDIT PROFILE */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Employee Profile
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update employee information and system role.
                </p>
              </div>

              <form
                action={updateEmployeeProfile}
                className="mt-6"
              >
                <input
                  type="hidden"
                  name="employee_id"
                  value={employee.id}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Full Name
                    </label>

                    <input
                      name="full_name"
                      type="text"
                      required
                      defaultValue={employee.full_name}
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      GDS Username
                    </label>

                    <input
                      name="username"
                      type="text"
                      required
                      defaultValue={employee.username}
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-slate-600">
                      Must end with .gds
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Title / Position
                    </label>

                    <input
                      name="title"
                      type="text"
                      required
                      defaultValue={employee.title ?? ""}
                      placeholder="Full Stack Developer"
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      System Role
                    </label>

                    <select
                      name="role"
                      defaultValue={employee.role}
                      className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="admin">
                        Admin
                      </option>

                      <option value="bde">
                        BDE / VA
                      </option>

                      <option value="developer">
                        Developer
                      </option>

                      <option value="graphic_designer">
                        Graphic Designer
                      </option>

                      <option value="staff">
                        Staff
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Save Profile Changes
                </button>
              </form>

        
            </div>

            {/* ADMIN NOTES */}
<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
  <h2 className="text-lg font-semibold">
    Admin Notes
  </h2>

  <p className="mt-1 text-sm text-slate-500">
    Private notes for administrators only. Employees cannot see these notes.
  </p>

  <form
    action={updateEmployeeAdminNotes}
    className="mt-6"
  >
    <input
      type="hidden"
      name="employee_id"
      value={employee.id}
    />

    <textarea
      name="admin_notes"
      rows={4}
      defaultValue={employee.admin_notes ?? ""}
      placeholder="Example: This is a practice account."
      className="w-full resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
    />

    <button
      type="submit"
      className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
    >
      Save Admin Note
    </button>
  </form>
</div>

            {/* WORK STATUS */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">
                Work Status
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Admin can override this employee&apos;s current
                availability.
              </p>

              <form
                action={manageEmployeeStatus}
                className="mt-6 space-y-4"
              >
                <input
                  type="hidden"
                  name="employee_id"
                  value={employee.id}
                />

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Status
                  </label>

                  <select
                    name="availability_status"
                    defaultValue={employee.availability_status}
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="available">
                      Available
                    </option>

                    <option value="working">
                      Working
                    </option>

                    <option value="limited">
                      Limited Availability
                    </option>

                    <option value="fully_booked">
                      Fully Booked
                    </option>

                    <option value="meeting">
                      On Meeting
                    </option>

                    <option value="break">
                      On Break
                    </option>

                    <option value="leave">
                      On Leave
                    </option>

                    <option value="offline">
                      Offline
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Available Again
                  </label>

                  <input
                    name="available_again_at"
                    type="datetime-local"
                    defaultValue={
                      employee.available_again_at
                        ? new Date(employee.available_again_at)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Status Note
                  </label>

                  <textarea
                    name="availability_note"
                    rows={3}
                    defaultValue={
                      employee.availability_note ?? ""
                    }
                    placeholder="Example: Working on Friendly English Space"
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Update Work Status
                </button>
              </form>
            </div>

            {/* PASSWORD */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">
                Change Password
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Set a new temporary password for this employee.
              </p>

              <form
                action={changeEmployeePassword}
                className="mt-6"
              >
                <input
                  type="hidden"
                  name="employee_id"
                  value={employee.id}
                />

                <label className="mb-2 block text-sm text-slate-300">
                  New Password
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    name="new_password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>

          {/* PROFILE PICTURE */}
<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
  <h2 className="text-lg font-semibold">
    Profile Picture
  </h2>

  <p className="mt-1 text-sm text-slate-500">
    Upload a new employee profile picture.
  </p>

  <form
    action={updateProfilePicture}
    className="mt-6"
  >
    <input
      type="hidden"
      name="employee_id"
      value={employee.id}
    />

    <label className="mb-2 block text-sm text-slate-300">
      Select Image
    </label>

    <input
      type="file"
      name="profile_picture"
      accept="image/jpeg,image/png,image/webp"
      required
      className="block w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
    />

    <p className="mt-2 text-xs text-slate-600">
      JPG, PNG or WebP. Maximum 5 MB.
    </p>

    <button
      type="submit"
      className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
    >
      Update Profile Picture
    </button>
  </form>
</div>
            {/* ACCOUNT ACCESS */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">
                Account Access
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Control whether this employee can access GDS Internal
                Operations.
              </p>

              {isOwnAccount ? (
                <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm text-amber-400">
                    You cannot deactivate your own administrator account
                    from this page.
                  </p>
                </div>
              ) : employee.is_active ? (
                <form
                  action={suspendEmployee}
                  className="mt-5"
                >
                  <input
                    type="hidden"
                    name="employee_id"
                    value={employee.id}
                  />

                  <button
                    type="submit"
                    className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    Deactivate Account
                  </button>

                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    Historical leads, projects and commissions will remain
                    attributed to this employee.
                  </p>
                </form>
              ) : (
                <form
                  action={reactivateEmployee}
                  className="mt-5"
                >
                  <input
                    type="hidden"
                    name="employee_id"
                    value={employee.id}
                  />

                  <button
                    type="submit"
                    className="rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-3 text-sm font-medium text-green-400 transition hover:bg-green-500/10"
                  >
                    Reactivate Account
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}