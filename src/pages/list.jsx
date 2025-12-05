import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
const TOKEN_STORAGE_KEY = "kds-token";

const formatDate = (value) => {
  if (!value) return "-";
  return value; // backend-də date hazırdır: "2025-12-02"
};

const formatTime = (value) => {
  if (!value) return "-";
  return value; // backend-də time hazırdır: "20:26:13"
};

export default function ListPage() {
  const router = useRouter();
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [authToken, setAuthToken] = useState("");

  // --- TOKEN NORMALIZER ---
  const normalizeToken = useCallback((tokenValue) => {
    if (!tokenValue) return "";
    const trimmed = tokenValue.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase().startsWith("bearer ")) return trimmed;
    return `Bearer ${trimmed}`;
  }, []);

  // --- TOKEN LOAD ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    const queryToken =
      typeof router.query.token === "string" ? router.query.token : null;

    if (queryToken) {
      const norm = normalizeToken(queryToken);
      setAuthToken(norm);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, norm);
      return;
    }

    const stored =
      window.localStorage.getItem(TOKEN_STORAGE_KEY) ||
      window.sessionStorage.getItem(TOKEN_STORAGE_KEY);

    if (stored) setAuthToken(normalizeToken(stored));
  }, [router.query.token, normalizeToken]);

  // ================================
  //    FETCH SCANNED USERS (FIXED)
  // ================================
  const fetchScannedUsers = useCallback(
    async (requestedPage = pagination.page) => {
      if (!apiBaseUrl) return setErrorMessage("API URL missing.");
      if (!authToken) return setErrorMessage("Authentication missing.");

      setIsLoading(true);
      setErrorMessage("");

      try {
        const currentPage = Math.max(1, requestedPage);

        const endpoint = new URL("scanned-users/", apiBaseUrl);
        endpoint.searchParams.set("page", String(currentPage));
        endpoint.searchParams.set("page_size", String(pagination.pageSize));

        const { data } = await axios.get(endpoint.toString(), {
          headers: {
            Authorization: authToken,
            "ngrok-skip-browser-warning": "true",
          },
        });

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : data?.data || [];

        // === FRONTEND-IN ESKI LOGICINE UYĞUN STRUKTUR YARADILIR ===
        const normalized = list.map((item, index) => {
          return {
            id: item.id ?? index,
            name: item.worker_name || item.name || "Unknown employee",

            // UI-də istifadə edilən dəyişənlər
            date: item.date, // "2025-12-02"
            scannedAt: item.date, // UI üçün date lazım idi → eyni saxlanır

            rawTime: item.entry_time || item.exit_time || null, // UI bundan istifadə edir

            scanType: item.entry_time && item.exit_time
              ? "exit" // əgər hər iki vaxt varsa → çıxış
              : item.entry_time
              ? "entry"
              : "-", // fallback

            entry_time: item.entry_time,
            exit_time: item.exit_time,
          };
        });

        setScans(normalized);

        setPagination({
          page: currentPage,
          pageSize: pagination.pageSize,
          total: list.length,
          hasNext: false,
          hasPrev: currentPage > 1,
        });
      } catch (error) {
        const msg = axios.isAxiosError(error)
          ? error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message
          : "Fetch error.";
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.page, pagination.pageSize, authToken]
  );

  useEffect(() => {
    if (authToken) fetchScannedUsers(pagination.page);
  }, [authToken, fetchScannedUsers, pagination.page]);

  // ====================
  //     TOTAL PAGES
  // ====================
  const totalPages = useMemo(() => {
    return Math.max(
      1,
      Math.ceil((pagination.total || scans.length) / pagination.pageSize)
    );
  }, [pagination.total, scans.length, pagination.pageSize]);

  // ====================
  //       EXPORT
  // ====================
  const handleExport = async () => {
    if (!apiBaseUrl) return setErrorMessage("API URL missing.");
    if (!authToken) return setErrorMessage("Authentication missing.");

    setExporting(true);

    try {
      const endpoint = new URL("export-excel/", apiBaseUrl);

      const { data } = await axios.get(endpoint.toString(), {
        responseType: "blob",
        headers: { Authorization: authToken },
      });

      const blob = new Blob([data], { type: "application/vnd.ms-excel" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMessage("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // ====================
  //        UI
  // ====================
  return (
    <div className="min-h-screen bg-[#EEF2FF]">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#98A2B3]">
              Attendance logs
            </p>
            <h1 className="text-2xl font-semibold text-[#0F172A]">
              Review every scan in chronological order
            </h1>
          </div>
          <Link href="/main" className="rounded-full border px-4 py-2 text-xs">
            Back to overview
          </Link>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#0F172A]">
              Attendance timeline
            </h2>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-full border px-3 py-1 text-xs"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>

          <div className="rounded-2xl border bg-[#F9FAFF] overflow-hidden">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#F1F3FF] sticky top-0">
                <tr className="border-b border-[#E5E7F5] text-[#7A7A7A]">
                  <th className="py-2 pl-4">Employee</th>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Entry time</th>
                  <th className="py-2 px-2">Exit time</th>
                </tr>
              </thead>

              <tbody>
                {scans.map((item) => (
                  <tr key={item.id} className="border-b text-[#141414]">
                    <td className="py-2 pl-4 pr-2 text-[11px]">{item.name}</td>

                    <td className="py-2 px-2 text-[11px]">
                      {formatDate(item.date)}
                    </td>

                    <td className="py-2 px-2 text-[11px]">
                      {formatTime(item.entry_time)}
                    </td>

                    <td className="py-2 px-2 text-[11px]">
                      {formatTime(item.exit_time)}
                    </td>
                  </tr>
                ))}

                {!scans.length && !isLoading && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[#7A7A7A]">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {errorMessage && (
            <p className="mt-4 text-xs text-red-500">{errorMessage}</p>
          )}
        </section>
      </div>
    </div>
  );
}
