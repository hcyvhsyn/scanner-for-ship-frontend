import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Sign In · Atlas</title>
        <meta
          name="description"
          content="Access your account to manage bookings, insights, and support."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f172a] via-[#1d1f2b] to-[#0f172a] px-4 text-white">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,#4c7ef5,rgba(76,143,242,0)_60%)]" />

        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-lg shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/40 text-lg font-semibold">
              QR
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-white/70">
              Access your dashboard with your credentials.
            </p>
          </div>

          <div className="mb-6 overflow-hidden rounded-2xl border border-white/15 shadow-lg">
            <Image
              src="/images/kds.png"
              alt="Karadeniz Powership Rauf Bey"
              width={640}
              height={320}
              className="h-40 w-full object-cover"
              priority
            />
            
          </div>

          <form className="space-y-5">
            <label className="block text-sm font-medium text-white/90">
              Email
              <input
                type="email"
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/80 focus:outline-none"
                placeholder="you@company.com"
              />
            </label>
            <div>
              <div className="flex items-center justify-between text-sm font-medium text-white/90">
                <span>Password</span>
                <a href="#" className="text-white/70 hover:text-white">
                  Forgot?
                </a>
              </div>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/80 focus:outline-none"
                placeholder="Enter your password"
              />
            </div>
          </form>
          <Link href="/main">
            <button className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-[#0f172a] shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-100">
              Continue
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
