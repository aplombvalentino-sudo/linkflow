"use client";

// Avatar control: shows the current photo (or an Upload placeholder), lets the
// user pick a file, client-validates type/size, uploads via the shared helper,
// and reports the hosted URL up. Remove clears it back to null.
import { useRef, useState } from "react";
import { Upload, Loader2, Trash2 } from "lucide-react";
import { MAX_AVATAR_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { uploadImage, uploadErrorMessage } from "./image-upload";

export function AvatarUploader({
  profileId,
  value,
  onChange,
}: {
  profileId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setError(uploadErrorMessage("invalid-type"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(uploadErrorMessage("too-large"));
      return;
    }
    setBusy(true);
    const res = await uploadImage(file, "avatar", profileId);
    setBusy(false);
    if (!res.ok) {
      setError(uploadErrorMessage(res.error));
      return;
    }
    onChange(res.url);
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
        avatar
      </p>
      <div className="mt-3 flex items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Profile avatar"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-white/15 bg-ink-800 text-text-lo">
            <Upload className="h-6 w-6" aria-hidden />
          </div>
        )}

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
                {value ? "Replace photo" : "Upload photo"}
              </>
            )}
          </button>
          {value && !busy && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                onChange(null);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          )}
        </div>
      </div>

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

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
