import axios from "axios";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
};

const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour12: false });
};

export default function ListPage() {
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

  const fetchScannedUsers = useCallback(
    async (requestedPage = pagination.page) => {
      if (!apiBaseUrl) {
        setErrorMessage("API base URL is missing. Please check .env.local.");
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const currentPage = Math.max(1, requestedPage);
        const endpoint = new URL("/api/scanned-users/", apiBaseUrl);
        endpoint.searchParams.set("page", String(currentPage));
        endpoint.searchParams.set("page_size", String(pagination.pageSize));
        const { data } = await axios.get(endpoint.toString());
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const totalCount =
          data?.count ??
          data?.total ??
          data?.total_results ??
          data?.totalCount ??
          list.length;
        const pageSize =
          data?.page_size ?? data?.pageSize ?? pagination.pageSize;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        const normalized = list.map((item, index) => {
          const scannedAt =
            item.scanned_at ||
            item.entry_time ||
            item.created_at ||
            item.createdAt ||
            null;

          return {
            id: item.id ?? item.scan_id ?? index,
            name:
              item.worker_name ||
              item.full_name ||
              item.name ||
              "Unknown employee",
            scanType: item.scan_type || "-",
            date: scannedAt,
            scannedAt,
            rawTime: item.time,
          };
        });

        setScans(normalized);
        setPagination({
          page: currentPage,
          pageSize,
          total: totalCount,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        });
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? typeof error.response?.data === "string"
            ? error.response.data
            : error.response?.data?.detail ||
              error.response?.data?.message ||
              error.message
          : error instanceof Error
          ? error.message
          : "An unexpected error occurred while fetching scanned users.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.page, pagination.pageSize]
  );

  useEffect(() => {
    fetchScannedUsers(pagination.page);
  }, [fetchScannedUsers, pagination.page]);

  const totalPages = useMemo(() => {
    if (!pagination.pageSize) return 1;
    return Math.max(
      1,
      Math.ceil((pagination.total || scans.length) / pagination.pageSize)
    );
  }, [pagination.pageSize, pagination.total, scans.length]);

  const handleExport = async () => {
    if (!apiBaseUrl) {
      setErrorMessage("API base URL is missing. Please check .env.local.");
      return;
    }
    setExporting(true);
    setErrorMessage("");

    try {
      const endpoint = new URL("/api/export-excel/", apiBaseUrl);
      endpoint.searchParams.set("page", String(pagination.page));
      endpoint.searchParams.set("page_size", String(pagination.pageSize));
      const { data } = await axios.get(endpoint.toString(), {
        responseType: "blob",
      });
      const blob = new Blob([data], { type: "application/vnd.ms-excel" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-export-page-${pagination.page}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message
        : error instanceof Error
        ? error.message
        : "An unexpected error occurred while exporting the file.";
      setErrorMessage(message);
    } finally {
      setExporting(false);
    }
  };

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
            <p className="text-sm text-[#475467]">
              Filter by time, refresh the data on demand, and export cleansed
              records directly from this view.
            </p>
          </div>
          <Link
            href="/main"
            className="rounded-full border border-[#D0D5DD] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Back to overview
          </Link>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#98A2B3]">
                Data table
              </p>
              <h2 className="text-base font-semibold text-[#0F172A]">
                Attendance timeline
              </h2>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className={`rounded-full border border-[#D0D5DD] px-3 py-1 text-xs font-semibold text-[#0F172A] transition ${
                exporting
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-[#F8FAFC]"
              }`}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-[#F0F0F0] bg-[#F9FAFF]">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#F1F3FF]">
                  <tr className="border-b border-[#E5E7F5] text-[#7A7A7A]">
                    <th className="py-2 pl-4 pr-2">Employee</th>
                    <th className="py-2 px-2">Date (MM.DD.YYYY)</th>
                    <th className="py-2 px-2">Entry time (hh:mm:ss)</th>
                    <th className="py-2 px-2">Exit time (hh:mm:ss)</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#EEF0FA] text-[#141414]"
                    >
                      <td className="py-2 pl-4 pr-2 text-[11px]">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#0F172A]">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-[#98A2B3] uppercase tracking-wide">
                            {item.scanType === "entry"
                              ? "ENTRY"
                              : item.scanType === "exit"
                              ? "EXIT"
                              : (item.scanType || "-").toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[11px]">
                        {formatDate(item.scannedAt || item.date)}
                      </td>
                      <td className="py-2 px-2 text-[11px]">
                        {item.scanType === "entry"
                          ? item.rawTime || formatTime(item.scannedAt)
                          : "-"}
                      </td>
                      <td className="py-2 px-2 text-[11px]">
                        {item.scanType === "exit"
                          ? item.rawTime || formatTime(item.scannedAt)
                          : "-"}
                      </td>
                    </tr>
                  ))}

                  {!scans.length && !isLoading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-[11px] text-[#7A7A7A]"
                      >
                        No attendance records were found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {errorMessage && (
            <p className="mt-4 text-[11px] text-red-500">{errorMessage}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => fetchScannedUsers(pagination.page)}
              disabled={isLoading}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                isLoading
                  ? "cursor-not-allowed border-[#E4E7EC] text-[#98A2B3]"
                  : "border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
              }`}
            >
              {isLoading ? "Refreshing..." : "Refresh data"}
            </button>

            <div className="flex items-center gap-2 text-[11px] text-[#7A7A7A]">
              <span>
                Page {pagination.page} / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchScannedUsers(pagination.page - 1)}
                  disabled={!pagination.hasPrev || isLoading}
                  className={`rounded-full px-3 py-1 transition ${
                    pagination.hasPrev && !isLoading
                      ? "border border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                      : "border border-[#E2E4EE] text-[#9B9B9B] cursor-not-allowed"
                  }`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => fetchScannedUsers(pagination.page + 1)}
                  disabled={!pagination.hasNext || isLoading}
                  className={`rounded-full px-3 py-1 transition ${
                    pagination.hasNext && !isLoading
                      ? "border border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                      : "border border-[#E2E4EE] text-[#9B9B9B] cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
