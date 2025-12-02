import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";

const apiBaseUrl = process.env.prodNEXT_PUBLIC_BASE_API_URL;
const TOKEN_STORAGE_KEY = "kds-token";

const getFeedbackStatus = (text) => {
  if (!text) return { colorClass: "", prefix: "" };
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i");
  const errorTokens = ["error", "fail", "not found", "not match", "tapilmadi"];
  const isError = errorTokens.some((token) => normalized.includes(token));
  return {
    colorClass: isError ? "text-red-500" : "text-[#0C9A4B]",
    prefix: isError ? "Alert:" : "Success:",
  };
};

const requestCameraAccess = async () => {
  if (typeof window === "undefined") {
    throw new Error("Window context is unavailable.");
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support camera access.");
  }

  const isSecure =
    window.isSecureContext || window.location.hostname === "localhost";
  if (!isSecure) {
    throw new Error(
      "Camera access requires HTTPS or running the app on localhost."
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
  });
  stream.getTracks().forEach((track) => track.stop());
};

export default function QRCodeScanPage() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [lastScanTime, setLastScanTime] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const html5QrCodeRef = useRef(null);
  const errorNotifiedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const [
    { colorClass: feedbackClass, prefix: feedbackPrefix },
    setFeedbackMeta,
  ] = useState({ colorClass: "", prefix: "" });

  useEffect(() => {
    setFeedbackMeta(getFeedbackStatus(scanFeedback));
  }, [scanFeedback]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryToken =
      typeof router.query.token === "string" ? router.query.token : null;

    if (queryToken) {
      setAuthToken(queryToken);
      window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, queryToken);
      window.localStorage?.setItem(TOKEN_STORAGE_KEY, queryToken);
      return;
    }

    const storedToken =
      window.sessionStorage?.getItem(TOKEN_STORAGE_KEY) ||
      window.localStorage?.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      setAuthToken(storedToken);
    }
  }, [router.query.token]);

  const buildFeedbackClasses = useCallback(
    (base) => (feedbackClass ? `${base} ${feedbackClass}` : base),
    [feedbackClass]
  );

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (error) {
        console.warn("Unable to stop the camera stream", error);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleScanResult = useCallback(
    async (decodedText) => {
      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;
      setScanResult(decodedText);
      setScanMessage("QR code captured, sending to the server...");
      setScanFeedback("");
      setLastScanTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setIsSubmitting(true);

      try {
        if (!apiBaseUrl) {
          throw new Error("API base URL is missing. Please check .env.prodlocal.");
        }
        if (!authToken) {
          throw new Error("Authentication credentials were not provided.");
        }

        const endpoint = new URL("scan/", apiBaseUrl).toString();
        const { data } = await axios.post(
          endpoint,
          { qr_text: decodedText },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: authToken,
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

        if (workerName) {
          setScanResult(workerName);
        }

        const successMessage =
          data?.message || "QR code successfully recorded.";
        const detail = data?.detail;

        if (workerName) {
          setScanFeedback(successMessage);
        } else if (detail) {
          setScanFeedback(detail);
        } else {
          setScanFeedback(successMessage);
        }
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? typeof error.response?.data === "string"
            ? error.response.data
            : error.response?.data?.detail ||
              error.response?.data?.message ||
              error.message
          : error instanceof Error
          ? error.message
          : "An unexpected error occurred while processing the QR code.";
        setScanFeedback(message);
      } finally {
        setIsSubmitting(false);
        await stopScanner();
        isProcessingRef.current = false;
      }
    },
    [stopScanner]
  );

  const startScanner = async () => {
    if (isScanning || isSubmitting) return;

    setScanMessage("Preparing the camera...");
    setScanResult("");
    setScanFeedback("");
    errorNotifiedRef.current = false;
    isProcessingRef.current = false;
    setIsScanning(true);

    try {
      await requestCameraAccess();

      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        (errorMessage) => {
          if (!errorNotifiedRef.current) {
            setScanMessage("Unable to read the code, retrying...");
            errorNotifiedRef.current = true;
          }
        }
      );

      setScanMessage("Camera is active, align the QR inside the frame.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while activating the camera.";
      setScanMessage(message);
      await stopScanner();
      setIsScanning(false);
    }
  };

  const restartScanner = async () => {
    await stopScanner();
    await startScanner();
  };

  return (
    <div className="min-h-screen bg-[#EEF2FF]">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#98A2B3]">
              Live validation
            </p>
            <h1 className="text-2xl font-semibold text-[#0F172A]">
              Scan QR badges in real time
            </h1>
            <p className="text-sm text-[#475467]">
              Use any modern browser to record entries and exits instantly. All
              scans are pushed to the attendance log in seconds.
            </p>
          </div>
          <Link
            href="/main"
            className="rounded-full border border-[#D0D5DD] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Back to overview
          </Link>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">
              Session status
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isScanning
                  ? "bg-[#E1F9EC] text-[#15803D]"
                  : "bg-[#F4F4F5] text-[#4B5563]"
              }`}
            >
              {isScanning ? "Camera online" : "Camera idle"}
            </span>
          </div>

          <div className="flex-1 rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F7F9FD] px-4 py-6 flex flex-col items-center justify-center gap-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-2 shadow">
              <div
                id="qr-reader"
                className="h-64 w-full overflow-hidden rounded-xl bg-[#0F172A]/5"
              />
            </div>

            <p className="text-center text-sm font-medium text-[#0F172A]">
              Aim the device at the employee&apos;s QR badge
            </p>
            <p className="text-center text-xs text-[#475467]">{scanMessage}</p>
            {scanFeedback && (
              <p className={buildFeedbackClasses("text-center text-xs")}>
                {feedbackPrefix} {scanFeedback}
              </p>
            )}

            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={isScanning ? stopScanner : startScanner}
                className={`w-full rounded-full px-4 py-3 text-sm font-semibold text-white transition ${
                  isScanning
                    ? "bg-[#B42318] hover:bg-[#991B1B]"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                }`}
              >
                {isScanning ? "Stop scanning" : "Start scanning"}
              </button>
              {isScanning && (
                <button
                  type="button"
                  onClick={restartScanner}
                  className="w-full rounded-full border border-[#2563EB] px-4 py-3 text-sm font-semibold text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition sm:w-auto"
                >
                  Restart scanner
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#98A2B3]">
              Last scan
            </p>
            {scanResult ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#0F172A] break-all">
                      {scanResult}
                    </p>
                    {lastScanTime && (
                      <p className="text-xs text-[#475467]">
                        Time: {lastScanTime}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex rounded-full bg-[#DCFCE7] px-3 py-[4px] text-[11px] font-semibold text-[#15803D]">
                    Recorded
                  </span>
                </div>
                {scanFeedback && (
                  <p className={buildFeedbackClasses("mt-2 text-xs")}>
                    {feedbackPrefix} {scanFeedback}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-[#98A2B3]">
                No QR code has been scanned yet. The last result will be shown
                here.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
