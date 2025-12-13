import "@/styles/globals.css";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

const navItems = [
  { href: "/main", label: "Overview" },
  { href: "/qr-code-generator", label: "Generate" },
  { href: "/qr-code-scan", label: "Scan" },
  { href: "/list", label: "Attendance Logs" },
];

const PUBLIC_ROUTES = new Set(["/login", "/"]);

const isBrowser = () => typeof window !== "undefined";

const normalizeToken = (token) => {
  if (!token || typeof token !== "string") return "";
  const trimmed = token.trim();
  if (!trimmed) return "";
  const hasBearerPrefix = trimmed.toLowerCase().startsWith("bearer ");
  return hasBearerPrefix
    ? `Bearer ${trimmed.slice(7).trim()}`
    : `Bearer ${trimmed}`;
};

const persistToken = (token) => {
  if (!token || !isBrowser()) return;
  sessionStorage.setItem("kds-token", token);
  localStorage.setItem("kds-token", token);
};

const readStoredToken = () => {
  if (!isBrowser()) return "";
  return (
    sessionStorage.getItem("kds-token") ||
    localStorage.getItem("kds-token") ||
    ""
  );
};

const resolveToken = (queryToken) => {
  const normalizedFromQuery = normalizeToken(queryToken);
  if (normalizedFromQuery) {
    persistToken(normalizedFromQuery);
    return normalizedFromQuery;
  }

  const storedSnapshot = normalizeToken(readStoredToken());
  if (storedSnapshot) {
    persistToken(storedSnapshot);
    return storedSnapshot;
  }

  return "";
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const pathWithoutQuery =
    router.asPath?.split("?")[0] ?? router.pathname ?? "";
  const hideNav = pathWithoutQuery === "/login" || pathWithoutQuery === "/";

  useEffect(() => {
    if (!router.isReady) return;

    const urlToken =
      typeof router.query.token === "string" ? router.query.token : "";

    if (PUBLIC_ROUTES.has(pathWithoutQuery)) {
      if (urlToken) {
        const normalized = normalizeToken(urlToken);
        if (normalized) persistToken(normalized);
      }
      return;
    }

    const effectiveToken = resolveToken(urlToken);
    if (!effectiveToken) {
      router.replace("/login");
    }
  }, [router, router.isReady, router.query.token, pathWithoutQuery]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#0F172A]">
      {!hideNav && (
        <nav className="sticky top-0 z-50 border-b border-white/20 bg-linear-to-r from-[#0F172A] to-[#1E3A8A] text-white shadow-lg">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white text-lg font-semibold backdrop-blur">
                QR
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                  Attendance Suite
                </p>
                <p className="text-base font-semibold">
                  Smart Workforce Control
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                      isActive
                        ? "bg-white text-[#0F172A] shadow-md"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      <main className="">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
