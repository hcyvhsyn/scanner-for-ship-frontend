"use client";

import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";

const TOKEN_STORAGE_KEY = "kds-token";

export default function MainPage() {
  const [authToken, setAuthToken] = useState("");

  // Token normalize — bütün səhifələrdə eyni olmalıdır
  const normalizeToken = useCallback((tokenValue) => {
    if (!tokenValue) return "";
    const trimmed = tokenValue.trim();
    if (!trimmed) return "";

    if (trimmed.toLowerCase().startsWith("bearer ")) {
      return `Bearer ${trimmed.slice(7).trim()}`;
    }
    return `Bearer ${trimmed}`;
  }, []);

  // Token oxu (login-dən gəlmiş və ya saxlanmış)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored =
      window.sessionStorage?.getItem(TOKEN_STORAGE_KEY) ||
      window.localStorage?.getItem(TOKEN_STORAGE_KEY);

    if (stored) {
      const norm = normalizeToken(stored);
      setAuthToken(norm);
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, norm); // always normalize
    }
  }, [normalizeToken]);

  // Token ilə link yaratmaq
  const withToken = (href) => {
    if (!authToken) return href;
    return `${href}?token=${encodeURIComponent(authToken)}`;
  };

  const navItems = [
    {
      href: withToken("/qr-code-generator"),
      title: "Generate QR IDs",
      description: "Create secure employee QR codes in seconds.",
    },
    {
      href: withToken("/qr-code-scan"),
      title: "Live Scanner",
      description: "Capture entries via camera with instant validation.",
    },
    {
      href: withToken("/list"),
      title: "Attendance Logs",
      description: "Review the full audit trail with export-ready data.",
    },
  ];

  // UI aşağı dəyişilmədən saxlanır
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
              href={withToken("/qr-code-generator")}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0F172A] shadow hover:shadow-lg transition"
            >
              Launch Generator
            </Link>
            <Link
              href={withToken("/qr-code-scan")}
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
