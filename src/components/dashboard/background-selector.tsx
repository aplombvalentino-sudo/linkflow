"use client";

// Background picker: a segmented control over animated / image / solid / spline,
// with the right sub-control revealed per mode — an uploader for image, a color
// pair for solid, a Spline-URL field (Pro only) for spline, a one-liner for
// animated. Emits partial patches the parent merges.
import { useRef, useState } from "react";
import { Upload, Loader2, Trash2, Lock, Sparkles } from "lucide-react";
import {
  BACKGROUND_STYLES,
  MAX_BACKGROUND_BYTES,
  ALLOWED_IMAGE_TYPES,
  SPLINE_HOST_SUFFIX,
} from "@/lib/constants";
import { uploadImage, uploadErrorMessage } from "./image-upload";
import { UpgradeButton } from "./upgrade-button";

const STYLE_LABELS: Record<string, string> = {
  animated: "animated",
  image: "image",
  solid: "solid",
  spline: "spline",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOR = "#07070b";

/** Client-side mirror of assertSplineUrl's host check, for instant feedback —
 *  the server re-validates and is the actual authority. */
function isSplineUrl(raw: string): boolean {
  try {
    const url = new URL(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (host === SPLINE_HOST_SUFFIX || host.endsWith(`.${SPLINE_HOST_SUFFIX}`))
    );
  } catch {
    return false;
  }
}

interface Props {
  profileId: string;
  style: string;
  imageUrl: string | null;
  color: string | null;
  splineUrl: string | null;
  isPro: boolean;
  onChange: (patch: {
    backgroundStyle?: string;
    backgroundImageUrl?: string | null;
    backgroundColor?: string | null;
    backgroundSplineUrl?: string | null;
  }) => void;
}

export function BackgroundSelector({
  profileId,
  style,
  imageUrl,
  color,
  splineUrl,
  isPro,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hexDraft, setHexDraft] = useState(color ?? DEFAULT_COLOR);
  const [splineDraft, setSplineDraft] = useState(splineUrl ?? "");
  const [splineFieldError, setSplineFieldError] = useState<string | null>(null);
  // What panel is showing below the segmented control. Usually mirrors `style`
  // (the real pending value), EXCEPT a locked "spline" tab: clicking it should
  // still reveal the upsell panel without actually switching the profile's
  // pending backgroundStyle to something a Free plan can't save.
  const [viewTab, setViewTab] = useState(style);

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

  function commitSpline(next: string) {
    setSplineDraft(next);
    setSplineFieldError(null);
    if (next.trim() === "") {
      onChange({ backgroundSplineUrl: null });
      return;
    }
    if (isSplineUrl(next.trim())) {
      onChange({ backgroundSplineUrl: next.trim() });
    } else {
      setSplineFieldError(`Paste a ${SPLINE_HOST_SUFFIX} scene link`);
    }
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
        background
      </p>

      {/* segmented control. A locked (non-Pro "spline") tab only changes which
          panel is showing (viewTab) — it never flips the real pending
          backgroundStyle, so Free users can preview the upsell without
          silently queuing up a save that the server would reject. */}
      <div className="mt-3 inline-flex flex-wrap gap-1 rounded-full glass p-1">
        {BACKGROUND_STYLES.map((s) => {
          const locked = s === "spline" && !isPro;
          const selected = locked ? viewTab === s : style === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={selected}
              aria-disabled={locked || undefined}
              onClick={() => {
                setViewTab(s);
                if (!locked) onChange({ backgroundStyle: s });
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-xs lowercase tracking-wide transition-colors duration-150 ${
                selected && !locked
                  ? "bg-volt text-ink-950"
                  : selected && locked
                    ? "bg-white/10 text-text-hi"
                    : locked
                      ? "text-text-lo/60 hover:text-text-lo"
                      : "text-text-lo hover:text-text-hi"
              }`}
            >
              {locked && <Lock className="h-3 w-3" aria-hidden />}
              {STYLE_LABELS[s]}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {viewTab === "animated" && (
          <p className="text-sm text-text-lo">
            A living gradient in your theme color that eases toward the
            visitor&apos;s cursor. Nothing to configure — it just breathes.
          </p>
        )}

        {viewTab === "image" && (
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

        {viewTab === "solid" && (
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

        {viewTab === "solid" && !HEX_RE.test(hexDraft) && hexDraft !== "" && (
          <p role="alert" className="mt-2 text-sm text-danger">
            Use a 6-digit hex, like #07070b.
          </p>
        )}

        {viewTab === "spline" && !isPro && (
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-ink-800/60 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-volt" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-hi">
                Bring your own animated scene
              </p>
              <p className="mt-1 text-sm text-text-lo">
                Paste a {SPLINE_HOST_SUFFIX} link and your page background
                becomes a live, interactive 3D scene — built and hosted by
                you. Pro only.
              </p>
              <div className="mt-3">
                <UpgradeButton />
              </div>
            </div>
          </div>
        )}

        {viewTab === "spline" && isPro && (
          <div>
            <label className="block">
              <span className="text-sm text-text-lo">
                Your {SPLINE_HOST_SUFFIX} scene link
              </span>
              <input
                value={splineDraft}
                onChange={(e) => commitSpline(e.target.value)}
                placeholder="https://my.spline.design/your-scene"
                autoComplete="off"
                spellCheck={false}
                className={`mt-1.5 w-full rounded-2xl border bg-ink-800 px-4 py-3 font-mono text-sm text-text-hi outline-none transition-colors placeholder:text-text-lo/60 ${
                  splineFieldError ? "border-danger/60" : "border-white/10 focus:border-volt/50"
                }`}
              />
            </label>
            {splineFieldError ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {splineFieldError}
              </p>
            ) : (
              <p className="mt-2 text-sm text-text-lo">
                Export a public scene from Spline, copy its viewer link, and
                paste it here. Until you add one, your page falls back to the
                animated gradient.
              </p>
            )}
          </div>
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
