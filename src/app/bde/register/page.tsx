import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitWorkQueue } from "@/app/actions/submit-work-queue";

export default async function RegisterClientPage() {
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
      username,
      full_name,
      role,
      title,
      is_active,
      profile_picture_url
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    redirect("/");
  }

  const allowedRoles = [
    "admin",
    "bde",
    "staff",
    "developer",
    "graphic_designer",
  ];

  if (!allowedRoles.includes(profile.role)) {
    redirect("/");
  }

  const isProduction = [
    "admin",
    "developer",
    "graphic_designer",
  ].includes(profile.role);

 const backHref =
  profile.role === "admin"
    ? "/admin/dashboard"
    : profile.role === "bde" || profile.role === "staff"
    ? "/bde/dashboard"
    : "/developer/dashboard";

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#07111f]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-8 py-6">
          <div className="flex items-center gap-5">
            <img
              src="/gds-logo.png"
              alt="Gimeno Design Solutions"
              className="h-12 w-auto object-contain"
            />

            <div className="border-l border-white/10 pl-5">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-400">
                GDS Internal Operations
              </p>

              <h1 className="mt-1 text-2xl font-semibold">
                Add Client
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold">
                {profile.full_name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {profile.title}
              </p>
            </div>

            <Link
              href={backHref}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        {/* INFO */}
        <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
          <p className="text-sm font-semibold text-blue-300">
            {isProduction
              ? "Production Client / Referral"
              : "New Client Registration"}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            The registration will automatically be attributed to your
            GDS account. Submission date and time are recorded by the
            system.
          </p>
        </div>

        <form
          action={submitWorkQueue}
          className="space-y-6"
        >
          {/* CLIENT INFORMATION */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <div>
              <h2 className="text-xl font-semibold">
                Client Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Contact and business information.
              </p>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {/* CLIENT NAME */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Client Name *
                </label>

                <input
                  name="client_name"
                  type="text"
                  required
                  placeholder="Example: Novelyn Fatt Tambiga"
                  className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* BUSINESS NAME */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Business Name
                </label>

                <input
                  name="business_name"
                  type="text"
                  placeholder="Example: Friendly English Space"
                  className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Email
                </label>

                <input
                  name="client_email"
                  type="email"
                  placeholder="client@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Phone / Contact Number
                </label>

                <input
                  name="client_phone"
                  type="text"
                  placeholder="+63..."
                  className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* SOURCE */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">
                  Source / Platform
                </label>

                <select
                  name="source_platform"
                  defaultValue=""
                  className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select source
                  </option>

                  <option value="Facebook">
                    Facebook
                  </option>

                  <option value="LinkedIn">
                    LinkedIn
                  </option>

                  <option value="Instagram">
                    Instagram
                  </option>

                  <option value="Referral">
                    Referral
                  </option>

                  <option value="Email">
                    Email
                  </option>

                  <option value="Website">
                    Website
                  </option>

                  <option value="Walk-in">
                    Walk-in
                  </option>

                  <option value="Existing Client">
                    Existing Client
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* PROJECT INFORMATION */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <div>
              <h2 className="text-xl font-semibold">
                Project Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Describe the service or project the client needs.
              </p>
            </div>

            <div className="mt-7 space-y-5">
              {/* PROJECT NAME */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Project / Service Name *
                </label>

                <input
                  name="project_name"
                  type="text"
                  required
                  placeholder="Example: Learning Platform"
                  className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* SERVICE */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Service Needed
                </label>

                <select
                  name="service_type"
                  defaultValue=""
                  className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select service
                  </option>

                  <option value="Website Development">
                    Website Development
                  </option>

                  <option value="Web Application">
                    Web Application
                  </option>

                  <option value="E-commerce">
                    E-commerce
                  </option>

                  <option value="Booking System">
                    Booking System
                  </option>

                  <option value="Internal System">
                    Internal System
                  </option>

                  <option value="Graphic Design">
                    Graphic Design
                  </option>

                  <option value="Logo Design">
                    Logo Design
                  </option>

                  <option value="Branding">
                    Branding
                  </option>

                  <option value="Social Media Design">
                    Social Media Design
                  </option>

                  <option value="Website + Graphic Design">
                    Website + Graphic Design
                  </option>

                  <option value="System + Graphic Design">
                    System + Graphic Design
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* REQUIREMENTS */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Client Requirements *
                </label>

                <textarea
                  name="description"
                  required
                  rows={9}
                  placeholder="Describe what the client needs, requested features, design requirements, deadlines, preferences, important details, etc."
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#08111f] px-4 py-3.5 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* PRIVACY */}
          <section className="rounded-2xl border border-white/10 bg-[#07111f] p-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" />

              <div>
                <p className="text-sm font-medium text-slate-300">
                  Internal Client Privacy
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Sensitive contact information will not automatically
                  be exposed to other employees. Public queue views will
                  only show masked client information. Full contact details
                  become available to the assigned or claiming production
                  member and authorized administrators.
                </p>
              </div>
            </div>
          </section>

          {/* SUBMIT */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Registered by
              </p>

              <p className="mt-1 text-sm font-medium text-slate-300">
                {profile.full_name} · {profile.username}
              </p>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Add Client to Queue
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}