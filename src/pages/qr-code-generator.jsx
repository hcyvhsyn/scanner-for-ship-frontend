import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
const TOKEN_STORAGE_KEY = "kds-token";
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const formatDateTime = (value) => {
  if (!value) {
    return dateTimeFormatter.format(new Date());
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return dateTimeFormatter.format(parsed);
  }

  return value;
};

export default function QRCodeGeneratorPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [workers, setWorkers] = useState([]);
  const [isWorkersLoading, setIsWorkersLoading] = useState(false);
  const [workersError, setWorkersError] = useState("");
  const [workersPagination, setWorkersPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [previewEntry, setPreviewEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [authToken, setAuthToken] = useState("");

  const readTokenFromStorage = useCallback(() => {
    if (typeof window === "undefined") return "";
    return (
      window.sessionStorage?.getItem(TOKEN_STORAGE_KEY) ||
      window.localStorage?.getItem(TOKEN_STORAGE_KEY) ||
      ""
    );
  }, []);

  const normalizeToken = useCallback((tokenValue) => {
    if (!tokenValue) return "";
    const trimmed = tokenValue.trim();
    if (!trimmed) return "";
    return trimmed.toLowerCase().startsWith("bearer ")
      ? `Bearer ${trimmed.slice(7).trim()}`
      : `Bearer ${trimmed}`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryToken =
      typeof router.query.token === "string" ? router.query.token : null;

    if (queryToken) {
      const normalized = normalizeToken(queryToken);
      setAuthToken(normalized);
      window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, normalized);
      window.localStorage?.setItem(TOKEN_STORAGE_KEY, normalized);
      return;
    }

    const storedToken = readTokenFromStorage();
    if (storedToken) {
      const normalized = normalizeToken(storedToken);
      setAuthToken(normalized);
      window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, normalized);
    }
  }, [normalizeToken, readTokenFromStorage, router.query.token]);

  const closePreview = () => setPreviewEntry(null);
  const closeDeleteModal = () => setDeleteTarget(null);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setWorkers((prev) =>
      prev.filter((entry) => entry.historyKey !== deleteTarget.historyKey)
    );
    if (previewEntry?.historyKey === deleteTarget.historyKey) {
      setPreviewEntry(null);
    }
    setDeleteTarget(null);
  };

  const fetchWorkers = useCallback(
    async (
      requestedPage = 1,
      requestedPageSize = workersPagination.pageSize
    ) => {
      if (!apiBaseUrl) {
        setWorkersError("API base URL is missing. Please check .env.local.");
        return;
      }
      const effectiveToken =
        authToken || normalizeToken(readTokenFromStorage());
      if (!effectiveToken) {
        setWorkersError("Authentication credentials were not provided.");
        return;
      }
      if (!authToken && effectiveToken) {
        setAuthToken(effectiveToken);
      }
      const currentPage = Math.max(1, requestedPage);
      const pageSizeToUse = Math.max(1, requestedPageSize);
      setIsWorkersLoading(true);
      setWorkersError("");
      try {
        const endpoint = new URL("workers/", apiBaseUrl);
        endpoint.searchParams.set("page", String(currentPage));
        endpoint.searchParams.set("page_size", String(pageSizeToUse));
        const { data } = await axios.get(endpoint.toString(), {
          headers: {
            Authorization: `Bearer ${effectiveToken.replace(/^Bearer\s+/i, "")}`,
            "ngrok-skip-browser-warning": "true",
          },
        });
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const normalized = list.map((item, index) => {
          const keySource =
            item.id ??
            item.worker_id ??
            item.uuid ??
            item.full_name ??
            item.name ??
            index;
          const name = item.full_name ?? item.name ?? "Unknown employee";
          const qrCode = item.qr_code ?? item.qrCode ?? "";
          const createdAt =
            item.created_at ??
            item.updated_at ??
            item.last_active ??
            item.last_activity ??
            item.createdAt ??
            item.updatedAt ??
            null;

          return {
            historyKey: `remote-${keySource}`,
            id: item.id ?? item.worker_id ?? null,
            fullName: name,
            qrCode,
            createdAt: formatDateTime(createdAt),
            status: item.status ?? item.employee_status ?? "",
            department:
              item.department ?? item.dept ?? item.department_name ?? "",
          };
        });

        const totalCount =
          data?.count ??
          data?.total ??
          data?.total_results ??
          data?.totalCount ??
          list.length;
        const pageSize = data?.page_size ?? data?.pageSize ?? pageSizeToUse;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        setWorkers(normalized);
        setWorkersPagination({
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
          : "An unexpected error occurred while loading the QR library.";
        setWorkersError(
          message ||
            "An unexpected error occurred while loading the QR library."
        );
      } finally {
        setIsWorkersLoading(false);
      }
    },
    [
      authToken,
      normalizeToken,
      readTokenFromStorage,
      workersPagination.pageSize,
    ]
  );

  useEffect(() => {
    if (!authToken) return;
    fetchWorkers(workersPagination.page, workersPagination.pageSize);
  }, [
    authToken,
    fetchWorkers,
    workersPagination.page,
    workersPagination.pageSize,
  ]);

  const handlePageChange = useCallback(
    (direction) => {
      if (direction === "next" && workersPagination.hasNext) {
        fetchWorkers(workersPagination.page + 1, workersPagination.pageSize);
      } else if (direction === "prev" && workersPagination.hasPrev) {
        fetchWorkers(workersPagination.page - 1, workersPagination.pageSize);
      }
    },
    [
      fetchWorkers,
      workersPagination.hasNext,
      workersPagination.hasPrev,
      workersPagination.page,
      workersPagination.pageSize,
    ]
  );

  const showLibrarySection = workers.length > 0;
  const showLibrarySkeleton =
    isWorkersLoading && workers.length === 0 && !workersError;

  const handleGenerate = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!apiBaseUrl) {
        throw new Error("API base URL is missing. Please check .env.local.");
      }
      if (!authToken) {
        throw new Error("Authentication credentials were not provided.");
      }

      const endpoint = new URL("generate-qr/", apiBaseUrl).toString();
      const effectiveToken =
        authToken || normalizeToken(readTokenFromStorage());
      if (!authToken && effectiveToken) {
        setAuthToken(effectiveToken);
      }
      const { data } = await axios.post(
        endpoint,
        { full_name: trimmedName },
        {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveToken.replace(/^Bearer\s+/i, "")}`,
          "ngrok-skip-browser-warning": "true",
        },

        }
      );

      const returnedName =
        data?.full_name || data?.data?.full_name || trimmedName;
      const qrCode = data?.qr_code || data?.data?.qr_code || "";
      const returnedId = data?.id ?? data?.data?.id ?? null;

      const createdAt = new Date().toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setWorkers((prev) => [
        {
          historyKey: `local-${returnedId ?? trimmedName}-${Date.now()}`,
          id: returnedId,
          fullName: returnedName,
          qrCode,
          createdAt,
          status: data?.status ?? "",
          department: data?.department ?? "",
        },
        ...prev,
      ]);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message
        : error instanceof Error
        ? error.message
        : "An unexpected error occurred while generating the QR code.";
      setErrorMessage(
        message || "An unexpected error occurred while generating the QR code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#EEF2FF] ">
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
        <header className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#667085]">
              Credential Studio
            </p>
            <h1 className="text-3xl font-semibold text-[#0F172A]">
              Generate tamper-proof QR IDs for every employee.
            </h1>
            <p className="text-sm text-[#475467]">
              Issue secure codes, preview them instantly, and keep an auditable
              library of every credential that leaves the HR desk.
            </p>
          </div>
          <Link
            href="/main"
            className="rounded-full border border-[#D0D5DD] px-5 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition"
          >
            Back to overview
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">
                Employee details
              </h2>
              <p className="text-sm text-[#475467]">
                Provide the legal name as it should appear on the badge. You can
                enrich the payload later with department IDs or access levels.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-[#475467]">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Eleanor Pena"
                  className="h-11 rounded-xl border border-[#D0D5DD] bg-[#F8FAFC] px-4 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                />
              </div>

              <div className="flex gap-2 rounded-2xl bg-[#F8FAFC] p-3 text-xs text-[#475467]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#2563EB] font-semibold">
                  i
                </span>
                <p>
                  In production you might send additional metadata such as
                  employee codes, cost centers, or expiration dates to the
                  backend.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full rounded-full px-5 py-3 text-sm font-semibold text-white transition shadow ${
                  isLoading
                    ? "bg-[#94A3B8] cursor-not-allowed"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                }`}
              >
                {isLoading ? "Sending request..." : "Generate QR code"}
              </button>

              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F8FAFF] p-6 shadow-inner text-sm text-[#475467]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#7C8DA6]">
              Best practice
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#2563EB]" />
                Ensure names match the HRIS exactly to avoid duplicates in audit
                logs.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#2563EB]" />
                Rotate QR identifiers whenever an employee changes department or
                role.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#2563EB]" />
                Archive inactive codes to keep the access list lean and reduce
                scanning noise.
              </li>
            </ul>
          </div>
        </section>

        {showLibrarySkeleton && (
          <section className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 text-sm text-[#475467]">
            Loading employees...
          </section>
        )}

        {showLibrarySection && (
          <section className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 h-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#475467]">
                  Active QR library
                </p>
                <p className="text-xs text-[#98A2B3]">
                  {workersPagination.total || workers.length} records available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchWorkers}
                  disabled={isWorkersLoading}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    isWorkersLoading
                      ? "cursor-not-allowed border-[#E4E7EC] text-[#98A2B3]"
                      : "border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                  }`}
                >
                  {isWorkersLoading ? "Refreshing..." : "Refresh list"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {isWorkersLoading && workers.length === 0 ? (
                <p className="text-sm text-[#98A2B3]">Loading employees...</p>
              ) : !workers.length ? (
                <p className="text-sm text-[#98A2B3]">
                  No QR codes were found.
                </p>
              ) : (
                workers.map((entry) => (
                  <div
                    key={entry.historyKey}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#E4E7EC] bg-[#F7F9FC] p-3"
                  >
                    <button
                      type="button"
                      onClick={() => entry.qrCode && setPreviewEntry(entry)}
                      className="flex flex-1 items-center justify-between gap-4 rounded-xl px-1 text-left transition hover:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
                          {entry.qrCode ? (
                            <Image
                              src={entry.qrCode}
                              alt={`${entry.fullName} QR code`}
                              width={96}
                              height={96}
                              className="h-full w-full object-contain"
                              unoptimized
                            />
                          ) : (
                            <div className="grid grid-cols-2 gap-1 p-2">
                              <div className="h-6 w-6 rounded-md bg-[#2563EB]" />
                              <div className="h-6 w-6 rounded-md border border-[#CBD5F5]" />
                              <div className="h-6 w-6 rounded-md border border-[#CBD5F5]" />
                              <div className="h-6 w-6 rounded-md bg-[#2563EB]" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">
                            {entry.fullName}
                          </p>
                          {entry.id && (
                            <p className="text-xs text-[#98A2B3]">
                              ID: {entry.id}
                            </p>
                          )}
                          {entry.department && (
                            <p className="text-xs text-[#98A2B3]">
                              Department: {entry.department}
                            </p>
                          )}
                          <p className="text-xs text-[#98A2B3]">
                            {entry.createdAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.status && (
                          <span className="rounded-full bg-[#DCFCE7] px-2 py-[2px] text-[10px] font-medium text-[#15803D]">
                            {entry.status}
                          </span>
                        )}
                        {entry.qrCode ? (
                          <>
                            <span className="sr-only">Preview QR</span>
                            <svg
                              className="h-5 w-5 text-[#2563EB]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="7" />
                              <line x1="16.65" y1="16.65" x2="21" y2="21" />
                            </svg>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-[#98A2B3]">
                            No QR file
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(entry)}
                      className="rounded-full border border-[#FECACA] bg-white p-2 text-[#B42318] transition hover:bg-[#FEE2E2]"
                      aria-label="Delete QR record"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M5 6l1-3h12l1 3" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {(workersPagination.hasPrev ||
              workersPagination.hasNext ||
              workersPagination.total > workersPagination.pageSize) && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E7EC] pt-4 text-xs text-[#98A2B3]">
                <p>
                  Page {workersPagination.page} /{` `}
                  {workersPagination.pageSize
                    ? Math.max(
                        1,
                        Math.ceil(
                          (workersPagination.total || workers.length) /
                            workersPagination.pageSize
                        )
                      )
                    : 1}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange("prev")}
                    disabled={!workersPagination.hasPrev || isWorkersLoading}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      workersPagination.hasPrev && !isWorkersLoading
                        ? "border border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        : "border border-[#E4E7EC] text-[#C8CDD7] cursor-not-allowed"
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange("next")}
                    disabled={!workersPagination.hasNext || isWorkersLoading}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      workersPagination.hasNext && !isWorkersLoading
                        ? "border border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        : "border border-[#E4E7EC] text-[#C8CDD7] cursor-not-allowed"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
        {workersError && !showLibrarySection && (
          <div className="rounded-2xl bg-white p-4 text-sm text-red-600 shadow ring-1 ring-red-100">
            {workersError}
          </div>
        )}
      </div>

      {previewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={closePreview}
              className="absolute right-3 top-3 text-[#98A2B3] hover:text-[#0F172A]"
              aria-label="Close preview"
            >
              &times;
            </button>
            <p className="mb-4 text-center text-sm font-semibold text-[#0F172A]">
              {previewEntry.fullName}
            </p>
            <div className="mx-auto mb-4 flex h-56 w-56 items-center justify-center rounded-2xl border border-[#EEF0F4] bg-[#F8FAFC] p-3">
              {previewEntry.qrCode ? (
                <Image
                  src={previewEntry.qrCode}
                  alt={`${previewEntry.fullName} QR code`}
                  width={256}
                  height={256}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-[#98A2B3]">
                  No QR data available.
                </span>
              )}
            </div>
            {previewEntry.id && (
              <p className="text-center text-xs text-[#98A2B3]">
                ID: {previewEntry.id}
              </p>
            )}
            <p className="text-center text-[10px] text-[#98A2B3]">
              {previewEntry.createdAt}
            </p>
            {previewEntry.qrCode && (
              <a
                href={previewEntry.qrCode}
                download={`${previewEntry.fullName}-qr.png`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-xs font-medium text-white hover:bg-[#1D4ED8]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download QR
              </a>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeDeleteModal}
              className="absolute right-3 top-3 text-[#98A2B3] hover:text-[#0F172A]"
              aria-label="Close dialog"
            >
              &times;
            </button>
            <p className="mb-2 text-center text-sm font-semibold text-[#0F172A]">
              {deleteTarget.fullName}
            </p>
            <p className="text-center text-xs text-[#475467]">
              Are you sure you want to delete this QR code?
            </p>
            <p className="mt-1 text-center text-[10px] text-[#98A2B3]">
              {deleteTarget.createdAt}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="w-full rounded-full border border-[#E4E7EC] px-4 py-2 text-xs font-medium text-[#475467] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="w-full rounded-full bg-[#B42318] px-4 py-2 text-xs font-medium text-white hover:bg-[#991B1B]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
