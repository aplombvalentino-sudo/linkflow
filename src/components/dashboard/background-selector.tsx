"use client";

// Background picker: a segmented control over animated / image / solid, with the
// right sub-control revealed per mode — an uploader for image, a color pair for
// solid, a one-liner for animated. Emits partial patches the parent merges.
import { useRef, useState } from "react";
import { Upload, Loader2, Trash2 } from "lucide-react";
import {
  BACKGROUND_STYLES,
  MAX_BACKGROUND_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/constants";
import { uploadImage, uploadErrorMessage } from "./image-upload";

const STYLE_LABELS: Record<string, string> = {
  animated: "animated",
  image: "image",
  solid: "solid",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOR = "#07070b";

interface Props {
  profileId: string;
  style: string;
  imageUrl: string | null;
  color: string | null;
  onChange: (patch: {
    backgroundStyle?: string;
    backgroundImageUrl?: string | null;
    backgroundColor?: string | null;
  }) => void;
}

export function BackgroundSelector({
  profileId,
  style,
  imageUrl,
  color,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hexDraft, setHexDraft] = useState(color ?? DEFAULT_COLOR);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setError(uploadErrorMessage("invalid-type"));
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      setError(uploadErrorMessage("too-large"));
      return;
    }
    setBusy(true);
    const res = await uploadImage(file, "background", profileId);
    setBusy(false);
    if (!res.ok) {
      setError(uploadErrorMessage(res.error));
      return;
    }
    onChange({ backgroundImageUrl: res.url });
  }

  function commitHex(next: string) {
    setHexDraft(next);
    if (HEX_RE.test(next)) onChange({ backgroundColor: next });
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
        background
      </p>

      {/* segmented control */}
      <div className="mt-3 inline-flex rounded-full glass p-1">
        {BACKGROUND_STYLES.map((s) => {
          const active = style === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ backgroundStyle: s })}
              className={`cursor-pointer rounded-full px-4 py-1.5 font-mono text-xs lowercase tracking-wide transition-colors duration-150 ${
                active
                  ? "bg-volt text-ink-950"
                  : "text-text-lo hover:text-text-hi"
              }`}
            >
              {STYLE_LABELS[s]}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {style === "animated" && (
          <p className="text-sm text-text-lo">
            A living gradient in your theme color. Nothing to configure — it just
            breathes.
          </p>
        )}

        {style === "image" && (
          <div>
            {imageUrl ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Background preview"
                  className="h-20 w-32 rounded-2xl object-cover"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full glass px-5 font-heading font-medium text-text-hi transition-colors duration-150 hover:border-volt/40 disabled:opacity-60"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" aria-hidden />
                        Replace
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      onChange({ backgroundImageUrl: null });
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-ink-800 text-text-lo transition-colors hover:border-volt/40 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-6 w-6" aria-hidden />
                )}
                <span className="font-mono text-xs uppercase tracking-wider">
                  {busy ? "uploading…" : "upload a cover photo"}
                </span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {style === "solid" && (
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Background color"
              value={HEX_RE.test(hexDraft) ? hexDraft : DEFAULT_COLOR}
              onChange={(e) => commitHex(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-2xl border border-white/10 bg-ink-800"
            />
            <input
              type="text"
              inputMode="text"
              aria-label="Background color hex"
              value={hexDraft}
              placeholder={DEFAULT_COLOR}
              onChange={(e) => commitHex(e.target.value.trim())}
              className={`w-32 rounded-2xl border bg-ink-800 px-4 py-3 font-mono text-sm text-text-hi outline-none transition-colors placeholder:text-text-lo/60 ${
                HEX_RE.test(hexDraft) || hexDraft === ""
                  ? "border-white/10 focus:border-volt/50"
                  : "border-danger/60"
              }`}
            />
          </div>
        )}

        {style === "solid" && !HEX_RE.test(hexDraft) && hexDraft !== "" && (
          <p role="alert" className="mt-2 text-sm text-danger">
            Use a 6-digit hex, like #07070b.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
