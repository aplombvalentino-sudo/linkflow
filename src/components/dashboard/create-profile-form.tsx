"use client";

// Compact "claim a page" form used on the dashboard: a handle field with a
// linkflow.to/ adornment, an optional display name, live handle validation,
// and a create button that routes to the new profile's editor on success.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createProfile } from "@/lib/actions/profile-actions";
import { handleValidationError } from "@/lib/validation";

export function CreateProfileForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = handleValidationError(handle);
  const canSubmit = handle.trim().length > 0 && !handleError && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const res = await createProfile({
      handle: handle.trim(),
      displayName: displayName.trim() || undefined,
    });

    if (!res.ok) {
      setError(res.message);
      setSubmitting(false);
      return;
    }
    router.push(`/dashboard/${res.profileId}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full text-left">
      <label
        htmlFor="cp-handle"
        className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo"
      >
        your handle
      </label>
      <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-ink-800 px-4 transition-colors focus-within:border-volt/50">
        <span className="shrink-0 font-mono text-sm text-text-lo">
          linkflow.to/
        </span>
        <input
          id="cp-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="yourname"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!handleError}
          className="w-full bg-transparent py-3 pl-1 font-mono text-text-hi outline-none placeholder:text-text-lo/60"
        />
      </div>
      {handleError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {handleError}
        </p>
      ) : null}

      <label
        htmlFor="cp-name"
        className="mt-4 block font-mono text-xs uppercase tracking-[0.2em] text-text-lo"
      >
        display name <span className="lowercase">(optional)</span>
      </label>
      <input
        id="cp-name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="What people will see up top"
        className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-text-hi outline-none transition-colors placeholder:text-text-lo/60 focus:border-volt/50"
      />

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-5 inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-volt px-7 font-heading font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Creating…
          </>
        ) : (
          "Create page"
        )}
      </button>
    </form>
  );
}
