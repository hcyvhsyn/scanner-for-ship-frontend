import "@/styles/globals.css";
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { href: "/main", label: "Overview" },
  { href: "/qr-code-generator", label: "Generate" },
  { href: "/qr-code-scan", label: "Scan" },
  { href: "/list", label: "Attendance Logs" },
];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#0F172A]">
      <nav className="sticky top-0 z-50 border-b border-white/20 bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white text-lg font-semibold backdrop-blur">
              QR
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                Attendance Suite
              </p>
              <p className="text-base font-semibold">Smart Workforce Control</p>
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

      <main className="pb-12">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
