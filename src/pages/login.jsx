import axios from "axios";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
const TOKEN_STORAGE_KEY = "kds-token";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();
    const trimmedPassword = password.trim();
    if (!trimmedNickname || !trimmedPassword) {
      setErrorMessage("Please provide both nickname and password.");
      return;
    }

    if (!apiBaseUrl) {
      setErrorMessage("API base URL is missing. Check your .env.local file.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const endpoint = new URL("./login/", apiBaseUrl).toString();
      const { data } = await axios.post(
        endpoint,
        { username: trimmedNickname, password: trimmedPassword },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const token =
        data?.token ||
        data?.access ||
        data?.data?.token ||
        data?.data?.access ||
        "";

      if (!token) {
        throw new Error("Authentication succeeded but no token was returned.");
      }

      const normalizedToken = token.trim();
      const bearerToken = normalizedToken.startsWith("Bearer ")
        ? normalizedToken
        : `Bearer ${normalizedToken}`;

      if (typeof window !== "undefined") {
        window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, bearerToken);
        window.localStorage?.setItem(TOKEN_STORAGE_KEY, bearerToken);
      }

      await router.push(`/main?token=${encodeURIComponent(bearerToken)}`);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message
        : error instanceof Error
        ? error.message
        : "An unexpected error occurred while signing in.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In · Atlas</title>
        <meta
          name="description"
          content="Access your account to manage bookings, insights, and support."
        />
        <link rel="icon" href="/kds-favicon.svg" />
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-white/90">
              Nickname
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/80 focus:outline-none"
                placeholder="Nickname"
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/80 focus:outline-none"
                placeholder="Enter your password"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-300">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold text-[#0f172a] shadow-lg transition ${
                isLoading
                  ? "bg-white/60 cursor-not-allowed"
                  : "bg-white hover:-translate-y-0.5 hover:bg-gray-100"
              }`}
            >
              {isLoading ? "Signing in..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
