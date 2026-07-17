"use client";

// The editor hub. Owns all editable profile state + the links list, wires the
// child controls, drives a live ProfileCard preview from that state, and
// persists via updateProfile / deleteProfile. Sub-UI lives in the child files
// to keep this under the line ceiling.
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Check, Trash2 } from "lucide-react";
import type { ProfileDoc, LinkDoc } from "@/lib/firebase/data";
import { buildCardProfile } from "@/lib/card-mapper";
import { ProfileCard } from "@/components/profile/profile-card";
import { updateProfile, deleteProfile } from "@/lib/actions/profile-actions";
import { MAX_DISPLAY_NAME_LEN, MAX_BIO_LEN } from "@/lib/constants";
import { ThemeSelector } from "./theme-selector";
import { BackgroundSelector } from "./background-selector";
import { AvatarUploader } from "./avatar-uploader";
import { LinksManager } from "./links-manager";
import { SharePanel } from "./share-panel";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ProfileEditor({
  profile,
  initialLinks,
  publicUrl,
  plan,
}: {
  profile: ProfileDoc;
  initialLinks: LinkDoc[];
  publicUrl: string;
  plan: "free" | "pro";
}) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [theme, setTheme] = useState<string>(profile.theme);
  const [isPublished, setIsPublished] = useState(profile.isPublished);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [backgroundStyle, setBackgroundStyle] = useState<string>(profile.backgroundStyle);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    profile.backgroundImageUrl,
  );
  const [backgroundColor, setBackgroundColor] = useState<string | null>(
    profile.backgroundColor,
  );
  const [backgroundSplineUrl, setBackgroundSplineUrl] = useState<string | null>(
    profile.backgroundSplineUrl,
  );
  const [links, setLinks] = useState<LinkDoc[]>(initialLinks);

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Snapshot of what's actually persisted. Links save instantly on their own,
  // but these profile fields only land on "Save changes" — so track the saved
  // baseline to (a) warn before the user loses unsaved edits and (b) drive the
  // share panel off the truly-published state, not the unsaved toggle.
  const [saved, setSaved] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    theme: profile.theme as string,
    isPublished: profile.isPublished,
    avatarUrl: profile.avatarUrl,
    backgroundStyle: profile.backgroundStyle as string,
    backgroundImageUrl: profile.backgroundImageUrl,
    backgroundColor: profile.backgroundColor,
    backgroundSplineUrl: profile.backgroundSplineUrl,
  });

  const current = {
    displayName,
    bio,
    theme,
    isPublished,
    avatarUrl,
    backgroundStyle,
    backgroundImageUrl,
    backgroundColor,
    backgroundSplineUrl,
  };
  const dirty = (Object.keys(current) as (keyof typeof current)[]).some(
    (k) => current[k] !== saved[k],
  );

  // Guard full-page unloads (tab close, reload, external nav) while there are
  // unsaved profile edits — an uploaded avatar/background would otherwise vanish.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function save() {
    setStatus("saving");
    setErrorMsg(null);
    const res = await updateProfile(profile.id, {
      displayName,
      bio,
      theme,
      isPublished,
      avatarUrl,
      backgroundStyle,
      backgroundImageUrl,
      backgroundColor,
      backgroundSplineUrl,
    });
    if (!res.ok) {
      setErrorMsg(res.message);
      setStatus("error");
      return;
    }
    setSaved(current);
    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function remove() {
    if (
      !window.confirm(
        "Delete this page for good? Its links and handle are released and can't be recovered.",
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await deleteProfile(profile.id);
    if (!res.ok) {
      setErrorMsg(res.message);
      setDeleting(false);
      return;
    }
    router.push("/dashboard");
  }

  const preview = buildCardProfile({
    handle: profile.handle,
    displayName,
    bio,
    theme,
    // Mirror the public page, which only renders active links (activeOnly).
    // Without this, hiding a link would still show it in the "live preview".
    links: links
      .filter((l) => l.isActive)
      .map((l) => ({
        title: l.title,
        url: l.url,
        meta: l.meta,
        clickCount: l.clickCount,
      })),
  });

  const inputCls =
    "w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-text-hi outline-none transition-colors placeholder:text-text-lo/60 focus:border-volt/50";

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_20rem]">
      {/* LEFT — controls */}
      <div className="flex flex-col gap-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
            editing
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold">
            @{profile.handle}
          </h1>
        </div>

        {/* Identity */}
        <div className="glass rounded-3xl p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
            identity
          </p>
          <label className="mt-3 block">
            <span className="text-sm text-text-lo">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, MAX_DISPLAY_NAME_LEN))}
              placeholder="What people call you"
              maxLength={MAX_DISPLAY_NAME_LEN}
              className={`mt-1.5 ${inputCls}`}
            />
            <span className="mt-1 block text-right font-mono text-[11px] text-text-lo">
              {displayName.length}/{MAX_DISPLAY_NAME_LEN}
            </span>
          </label>
          <label className="mt-2 block">
            <span className="text-sm text-text-lo">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LEN))}
              placeholder="One line on what you do. Make it count."
              maxLength={MAX_BIO_LEN}
              rows={3}
              className={`mt-1.5 resize-none ${inputCls}`}
            />
            <span className="mt-1 block text-right font-mono text-[11px] text-text-lo">
              {bio.length}/{MAX_BIO_LEN}
            </span>
          </label>

          <div className="mt-4">
            <AvatarUploader
              profileId={profile.id}
              value={avatarUrl}
              onChange={setAvatarUrl}
            />
          </div>
        </div>

        {/* Look */}
        <div className="glass rounded-3xl p-5">
          <ThemeSelector value={theme} onChange={setTheme} />
          <div className="mt-5">
            <BackgroundSelector
              profileId={profile.id}
              style={backgroundStyle}
              imageUrl={backgroundImageUrl}
              color={backgroundColor}
              splineUrl={backgroundSplineUrl}
              isPro={plan === "pro"}
              onChange={(patch) => {
                if (patch.backgroundStyle !== undefined) setBackgroundStyle(patch.backgroundStyle);
                if (patch.backgroundImageUrl !== undefined) setBackgroundImageUrl(patch.backgroundImageUrl);
                if (patch.backgroundColor !== undefined) setBackgroundColor(patch.backgroundColor);
                if (patch.backgroundSplineUrl !== undefined) setBackgroundSplineUrl(patch.backgroundSplineUrl);
              }}
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="glass flex items-center justify-between rounded-3xl p-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
              visibility
            </p>
            <p className="mt-1 text-sm text-text-lo">
              {isPublished
                ? "Live — anyone with the link can see it."
                : "Hidden — only you can see it right now."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublished}
            onClick={() => setIsPublished((v) => !v)}
            className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 font-heading text-sm font-medium transition-colors duration-150 ${
              isPublished
                ? "bg-volt text-ink-950"
                : "glass text-text-hi hover:border-volt/40"
            }`}
          >
            {isPublished ? (
              <Eye className="h-4 w-4" aria-hidden />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden />
            )}
            {isPublished ? "Public" : "Hidden"}
          </button>
        </div>

        {/* Links */}
        <LinksManager profileId={profile.id} links={links} onChange={setLinks} />

        {/* Danger zone */}
        <div className="flex items-center justify-between border-t border-white/5 pt-5">
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-danger disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            {deleting ? "Deleting…" : "Delete page"}
          </button>
        </div>
      </div>

      {/* RIGHT — share + live preview + save */}
      <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <SharePanel
          publicUrl={publicUrl}
          handle={profile.handle}
          isPublished={saved.isPublished}
        />

        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
            live preview
          </p>
          <div className="mx-auto max-w-xs rounded-[2rem] border border-white/10 bg-ink-950 p-3">
            <ProfileCard profile={preview} animateIn={false} />
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <button
            type="button"
            onClick={save}
            disabled={status === "saving"}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-volt px-7 font-heading font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : status === "saved" ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Saved
              </>
            ) : (
              "Save changes"
            )}
          </button>
          {status === "error" && errorMsg && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {errorMsg}
            </p>
          )}
          {dirty && status !== "saving" && (
            <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-wider text-text-lo">
              Unsaved changes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
