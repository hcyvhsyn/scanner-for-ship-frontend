import Link from "next/link";
import React from "react";

const navItems = [
  {
    href: "/qr-code-generator",
    title: "Generate QR IDs",
    description: "Create secure employee QR codes in seconds.",
  },
  {
    href: "/qr-code-scan",
    title: "Live Scanner",
    description: "Capture entries via camera with instant validation.",
  },
  {
    href: "/list",
    title: "Attendance Logs",
    description: "Review the full audit trail with export-ready data.",
  },
];

export default function MainPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white via-[#F3F4F6] to-white">
      <main className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <section className="rounded-3xl bg-[#0F172A] p-8 text-white shadow-2xl space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-3">
              Workforce Intelligence
            </p>
            <h1 className="text-3xl font-semibold leading-tight">
              Run attendance operations with clarity, control, and speed.
            </h1>
            <p className="mt-4 text-base text-white/70">
              Generate QR credentials, scan in the field, and inspect audit logs
              on a single surface designed for HR and security teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/qr-code-generator"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0F172A] shadow hover:shadow-lg transition"
            >
              Launch Generator
            </Link>
            <Link
              href="/qr-code-scan"
              className="rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Open Scanner
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-[#475467]">Modules</p>
              <h2 className="text-2xl font-semibold text-[#101828]">
                Choose a workspace
              </h2>
              <p className="text-sm text-[#475467]">
                Move between QR creation, scanning, and reporting without losing
                context.
              </p>
            </div>
            <nav className="grid gap-4 md:grid-cols-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-[#E4E7EC] bg-linear-to-b from-white to-[#F8FAFC] p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-lg"
                >
                  <p className="text-base font-semibold text-[#101828]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm text-[#475467]">
                    {item.description}
                  </p>
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-[#CBD5F5] bg-[#EDF2FF] p-6 text-sm text-[#1D2939]">
          <p className="font-semibold text-[#0F172A] mb-2">Workflow recap</p>
          <p>
            1. Create a QR credential on{" "}
            <span className="font-semibold">Generate</span>.
          </p>
          <p>
            2. Validate on-site via the{" "}
            <span className="font-semibold">Live Scanner</span>.
          </p>
          <p>
            3. Audit everything inside{" "}
            <span className="font-semibold">Attendance Logs</span>.
          </p>
        </section>
      </main>
    </div>
  );
}
