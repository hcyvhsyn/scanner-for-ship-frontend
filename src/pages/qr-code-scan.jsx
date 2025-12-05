import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
const TOKEN_STORAGE_KEY = "kds-token";

const getFeedbackStatus = (text) => {
  if (!text) return { colorClass: "", prefix: "" };
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i");

  const errTokens = ["error", "fail", "not found", "not match", "tapilmadi"];
  const isErr = errTokens.some((t) => normalized.includes(t));

  return {
    colorClass: isErr ? "text-red-500" : "text-[#0C9A4B]",
    prefix: isErr ? "Alert:" : "Success:",
  };
};

// 🟢 TOKEN NORMALIZER — ən vacib hissə
const normalizeToken = (tokenValue) => {
  if (!tokenValue) return "";
  const trimmed = tokenValue.trim();
  if (!trimmed) return "";

  // artıq Bearer ilə gəlirsə toxunmuruq
  if (trimmed.toLowerCase().startsWith("bearer ")) return trimmed;

  return `Bearer ${trimmed}`;
};

const requestCameraAccess = async () => {
  if (typeof window === "undefined") throw new Error("Window unavailable.");

  if (!navigator?.mediaDevices?.getUserMedia)
    throw new Error("Camera is not supported on this browser.");

  const isSecure =
    window.isSecureContext || window.location.hostname === "localhost";

  if (!isSecure)
    throw new Error("Camera requires HTTPS or a localhost environment.");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
  });

  stream.getTracks().forEach((t) => t.stop());
};

export default function QRCodeScanPage() {
  const router = useRouter();

  const [authToken, setAuthToken] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [lastScanTime, setLastScanTime] = useState("");

  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);
  const errorNotifiedRef = useRef(false);

  const [
    { colorClass: feedbackClass, prefix: feedbackPrefix },
    setFeedbackMeta,
  ] = useState({ colorClass: "", prefix: "" });

  useEffect(() => {
    setFeedbackMeta(getFeedbackStatus(scanFeedback));
  }, [scanFeedback]);

  // 🟢 TOKEN LOAD
  useEffect(() => {
    if (typeof window === "undefined") return;

    let stored =
      window.localStorage.getItem(TOKEN_STORAGE_KEY) ||
      window.sessionStorage.getItem(TOKEN_STORAGE_KEY);

    if (stored) {
      setAuthToken(stored);
      return;
    }

    // URL token
    const queryToken =
      typeof router.query.token === "string" ? router.query.token : null;

    if (queryToken) {
      setAuthToken(queryToken);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, queryToken);
      return;
    }

    router.push("/login");
  }, [router, router.query.token]);

  const buildFeedbackClasses = useCallback(
    (base) => (feedbackClass ? `${base} ${feedbackClass}` : base),
    [feedbackClass]
  );

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn("Camera stop error:", e);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  // 🟢 SCAN REQUEST
  const handleScanResult = useCallback(
    async (decodedText) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      const effectiveToken = normalizeToken(authToken);

      if (!effectiveToken) {
        setScanFeedback("Authentication required.");
        router.push("/login");
        return;
      }

      setIsSubmitting(true);
      setScanMessage("QR captured, sending to server...");
      setScanFeedback("");
      setScanResult(decodedText);

      setLastScanTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      try {
        const endpoint = new URL("scan/", apiBaseUrl).toString();

        const { data } = await axios.post(
          endpoint,
          { qr_text: decodedText },
          {
            headers: {
              Authorization: effectiveToken,
              "ngrok-skip-browser-warning": "true",
              "Content-Type": "application/json",
            },
          }
        );

        const workerName =
          data?.full_name ||
          data?.worker_name ||
          data?.worker?.full_name ||
          data?.employee?.full_name ||
          data?.name ||
          null;

        if (workerName) setScanResult(workerName);

        setScanFeedback(data?.message || data?.detail || "Scan successful.");
      } catch (err) {
        let msg = "Unexpected error.";

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            msg = "Authentication failed. Redirecting...";
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
            setTimeout(() => router.push("/login"), 1200);
          } else {
            msg =
              err.response?.data?.detail ||
              err.response?.data?.message ||
              err.message;
          }
        } else if (err instanceof Error) {
          msg = err.message;
        }

        setScanFeedback(msg);
      } finally {
        setIsSubmitting(false);
        await stopScanner();
        isProcessingRef.current = false;
      }
    },
    [authToken, router, stopScanner]
  );

  // 🟢 START CAMERA
  const startScanner = async () => {
    if (isScanning || isSubmitting) return;

    const effectiveToken = normalizeToken(authToken);
    if (!effectiveToken) {
      setScanMessage("Authentication required. Redirecting...");
      setTimeout(() => router.push("/login"), 1200);
      return;
    }

    setScanMessage("Starting camera...");
    setScanResult("");
    setScanFeedback("");
    isProcessingRef.current = false;
    errorNotifiedRef.current = false;
    setIsScanning(true);

    try {
      await requestCameraAccess();

      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleScanResult(decodedText),
        () => {
          if (!errorNotifiedRef.current) {
            setScanMessage("Unable to read QR, retrying...");
            errorNotifiedRef.current = true;
          }
        }
      );

      setScanMessage("Camera active. Aim QR inside the frame.");
    } catch (e) {
      setScanMessage(e.message || "Failed to activate camera.");
      await stopScanner();
    }
  };

  const restartScanner = async () => {
    await stopScanner();
    await startScanner();
  };

  const sessionStatusCopy = isSubmitting
    ? "Transmitting scan..."
    : isScanning
    ? "Camera streaming"
    : "Session idle";

  const helperMessage =
    scanMessage ||
    "Launch the camera to align a QR credential inside the guide box.";

  const apiFeedbackCopy = scanFeedback
    ? `${feedbackPrefix} ${scanFeedback}`
    : "Awaiting a response from the validation API.";

  const hasLastScan = Boolean(scanResult);

  // 🟢 UI
  return (
    <div className="min-h-screen bg-[#EEF2FF]">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span
                className={`rounded-full px-4 py-1 text-xs font-semibold ${
                  isScanning
                    ? "bg-[#E1F9EC] text-[#15803D]"
                    : "bg-[#F4F4F5] text-[#4B5563]"
                }`}
              >
                {isScanning ? "Camera online" : "Camera idle"}
              </span>
            </div>

            <div className="rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F7F9FD] p-5 space-y-4">
              <div className="w-full rounded-2xl bg-white/90 p-3 shadow-inner">
                <div
                  id="qr-reader"
                  className="h-72 w-full rounded-xl bg-[#0F172A]/5"
                />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-[#0F172A]">{helperMessage}</p>
                {scanFeedback ? (
                  <p className={buildFeedbackClasses("text-xs")}>
                    {apiFeedbackCopy}
                  </p>
                ) : (
                  <p className="text-xs text-[#98A2B3]">{apiFeedbackCopy}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={isScanning ? stopScanner : startScanner}
                disabled={isSubmitting}
                className={`w-full rounded-full px-4 py-3 text-sm font-semibold text-white shadow transition ${
                  isScanning
                    ? "bg-[#B42318] hover:bg-[#991B1B]"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                } ${isSubmitting ? "cursor-not-allowed opacity-80" : ""}`}
              >
                {isSubmitting
                  ? "Processing..."
                  : isScanning
                  ? "Stop scanning"
                  : "Start scanning"}
              </button>
              <button
                onClick={restartScanner}
                disabled={!isScanning}
                className={`w-full rounded-full border px-4 py-3 text-sm font-semibold transition ${
                  isScanning
                    ? "border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                    : "border-[#E4E7EC] text-[#98A2B3] cursor-not-allowed"
                }`}
              >
                Restart scanner
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#98A2B3]">
                    Last detection
                  </p>
                  <h3 className="text-lg font-semibold text-[#0F172A]">
                    {hasLastScan ? scanResult : "Awaiting first scan"}
                  </h3>
                  <p className="text-sm text-[#475467]">
                    {hasLastScan
                      ? "Latest badge recorded from the live session."
                      : "Once a QR is validated, the employee details appear here."}
                  </p>
                </div>
                {hasLastScan && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-4 py-1 text-xs font-semibold text-[#15803D]">
                    <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                    Recorded
                  </span>
                )}
              </div>

              <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm text-[#475467] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#98A2B3]">
                  <span>Timestamp</span>
                  <span>{lastScanTime || "—"}</span>
                </div>
                <div className="rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3 text-xs">
                  {scanFeedback
                    ? apiFeedbackCopy
                    : "API responses will be logged here once a QR is validated."}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
