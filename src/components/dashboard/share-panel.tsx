"use client";

// Share surface for a published profile: the public URL in a copyable mono
// field, a "view page" out-link, and a client-generated QR code. If QR
// generation fails we simply hide it — the copy field still works.
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, ExternalLink, EyeOff } from "lucide-react";

export function SharePanel({
  publicUrl,
  handle,
  isPublished,
}: {
  publicUrl: string;
  handle: string;
  isPublished: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    // A hidden page 404s for everyone, so skip QR generation — the component
    // early-returns the "hidden" panel below and never renders `qr` anyway.
    if (!isPublished) return;
    let alive = true;
    QRCode.toDataURL(publicUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#07070b", light: "#f4f5f0" },
    })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [publicUrl, isPublished]);

  if (!isPublished) {
    return (
      <div className="glass rounded-3xl p-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
          share
        </p>
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-text-lo" aria-hidden />
          <div>
            <p className="text-sm font-medium text-text-hi">This page is hidden</p>
            <p className="mt-1 text-sm text-text-lo">
              Flip visibility to Public and save — then your link, QR code, and
              live page show up here.
            </p>
            <p className="mt-2 truncate font-mono text-xs text-text-lo/70">
              {publicUrl}
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op; the field is still selectable by hand.
    }
  }

  return (
    <div className="glass rounded-3xl p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
        share
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={publicUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your public LinkFlow URL"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 font-mono text-sm text-text-hi outline-none focus:border-volt/50"
        />
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy URL"}
          className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl glass text-text-hi transition-colors duration-150 hover:border-volt/40"
        >
          {copied ? (
            <Check className="h-5 w-5 text-volt" aria-hidden />
          ) : (
            <Copy className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {qr && (
          <div className="shrink-0 rounded-2xl bg-text-hi p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={`QR code linking to @${handle}'s LinkFlow page`}
              className="h-24 w-24"
            />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-text-lo">
            Point a phone camera at the code, or send the link straight over.
          </p>
          <a
            href={`/${handle}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-volt transition-opacity hover:opacity-80"
          >
            View page
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
