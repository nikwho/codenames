import { useEffect, useState } from "react";

interface RoomQrCodeProps {
  url?: string;
  size?: number;
  className?: string;
}

export function RoomQrCode({ url, size = 160, className = "" }: RoomQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targetUrl = (url?.trim() || (typeof window !== "undefined" ? window.location.href : "")).trim();

  useEffect(() => {
    if (!targetUrl) {
      return;
    }

    let cancelled = false;
    setDataUrl(null);
    setError(null);

    void (async () => {
      try {
        const qrcode = await import("qrcode");
        const toDataURL = qrcode.toDataURL ?? qrcode.default?.toDataURL;
        if (typeof toDataURL !== "function") {
          throw new Error("qrcode.toDataURL unavailable");
        }
        const next = await toDataURL(targetUrl, {
          width: Math.max(size * 2, 256),
          margin: 1,
          color: {
            dark: "#1a140c",
            light: "#efe3ca"
          },
          errorCorrectionLevel: "M"
        });
        if (!cancelled) {
          setDataUrl(next);
        }
      } catch (err) {
        console.error("QR generation failed", err);
        if (!cancelled) {
          setError("Не удалось создать QR");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [size, targetUrl]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-[var(--tile)] p-3 text-center text-xs text-[var(--tile-text)] ${className}`}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`animate-pulse rounded-2xl bg-[var(--tile)]/80 ${className}`}
        style={{ width: size, height: size }}
        aria-busy="true"
        aria-label="Генерация QR-кода"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR-код: ${targetUrl}`}
      width={size}
      height={size}
      className={`block rounded-2xl ${className}`}
    />
  );
}
