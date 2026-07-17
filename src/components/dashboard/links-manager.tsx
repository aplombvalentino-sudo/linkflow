// Owns the profile's link list: renders each LinkRow, an add-link form, an
// add-email quick form, and move up/down reordering (optimistic + persisted).
// Parent holds the canonical links state via onChange so the live preview
// reflects every edit.
"use client";

import { useState } from "react";
import { Plus, Mail, Loader2 } from "lucide-react";
import type { LinkDoc } from "@/lib/firebase/data";
import { createLink, reorderLinks } from "@/lib/actions/link-actions";
import { emailAddressError } from "@/lib/validation";
import { LinkRow } from "./link-row";

type AddMode = "none" | "link" | "email";

export function LinksManager({
  profileId,
  links,
  onChange,
}: {
  profileId: string;
  links: LinkDoc[];
  onChange: (links: LinkDoc[]) => void;
}) {
  const [mode, setMode] = useState<AddMode>("none");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailErrorState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForms() {
    setTitle("");
    setUrl("");
    setMeta("");
    setEmail("");
    setEmailErrorState(null);
    setError(null);
  }

  function appendLink(res: { linkId: string; title: string; url: string; meta: string }) {
    const newLink: LinkDoc = {
      id: res.linkId,
      profileId,
      userId: "",
      // Use the server-normalized values (https:// added, trimmed) so the live
      // preview matches the persisted link, not the raw text typed here.
      title: res.title,
      url: res.url,
      meta: res.meta,
      thumbnailUrl: null,
      position: links.length,
      isActive: true,
      clickCount: 0,
    };
    onChange([...links, newLink]);
  }

  async function add() {
    setError(null);
    if (!title.trim() || !url.trim()) {
      setError("A link needs a title and a URL.");
      return;
    }
    setBusy(true);
    const res = await createLink(profileId, { title, url, meta });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    appendLink(res);
    resetForms();
    setMode("none");
  }

  async function addEmail() {
    setError(null);
    const trimmed = email.trim();
    const shapeError = emailAddressError(trimmed);
    if (!trimmed || shapeError) {
      setEmailErrorState(shapeError ?? "Enter an email address.");
      return;
    }
    setBusy(true);
    // assertUrl (server-side) turns a bare address into mailto: automatically.
    const res = await createLink(profileId, { title: "Email me", url: trimmed, meta: trimmed });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    appendLink(res);
    resetForms();
    setMode("none");
  }

  function patchLink(id: string, patch: Partial<LinkDoc>) {
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLink(id: string) {
    onChange(links.filter((l) => l.id !== id));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= links.length) return;
    const prev = links;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    setError(null);
    onChange(next); // optimistic
    void reorderLinks(profileId, next.map((l) => l.id)).then((res) => {
      if (!res.ok) {
        // Roll back so the on-screen order can't drift from what's persisted.
        onChange(prev);
        setError(res.message);
      }
    });
  }

  const inputCls =
    "w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-text-hi outline-none transition-colors placeholder:text-text-lo/60 focus:border-volt/50";

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
          links
        </p>
        <span className="font-mono text-xs text-text-lo">{links.length}</span>
      </div>

      {links.length === 0 && mode === "none" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
          <p className="font-heading text-base font-semibold text-text-hi">
            No links yet
          </p>
          <p className="mt-1 text-sm text-text-lo">
            Your first link is the whole point. Add the one you want people to
            tap.
          </p>
          <button
            type="button"
            onClick={() => setMode("link")}
            className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-volt px-6 font-heading font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add your first link
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className="mt-3 block w-full cursor-pointer font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-text-hi"
          >
            or add your email
          </button>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {links.map((link, i) => (
            <LinkRow
              key={link.id}
              link={link}
              onUpdate={(patch) => patchLink(link.id, patch)}
              onDelete={() => removeLink(link.id)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < links.length - 1}
            />
          ))}
        </ul>
      )}

      {mode === "link" && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-800/50 p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Link title (e.g. Watch live on Twitch)"
            aria-label="New link title"
            className={inputCls}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            aria-label="New link URL"
            className={inputCls}
          />
          <input
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder="Optional note (e.g. Live Fri 8pm)"
            aria-label="New link note"
            className={inputCls}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-volt px-5 font-heading text-sm font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Add link
            </button>
            <button
              type="button"
              onClick={() => {
                resetForms();
                setMode("none");
              }}
              className="cursor-pointer rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-text-hi"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "email" && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-800/50 p-3">
          <label className="block">
            <span className="sr-only">Your email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailErrorState(null);
              }}
              placeholder="you@example.com"
              aria-label="Your email address"
              autoComplete="off"
              className={inputCls}
            />
          </label>
          {emailError ? (
            <p role="alert" className="text-xs text-danger">
              {emailError}
            </p>
          ) : (
            <p className="text-xs text-text-lo">
              Tapping this on your page opens the visitor&apos;s own mail app,
              addressed to you.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addEmail}
              disabled={busy}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-volt px-5 font-heading text-sm font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Mail className="h-4 w-4" aria-hidden />
              )}
              Add email
            </button>
            <button
              type="button"
              onClick={() => {
                resetForms();
                setMode("none");
              }}
              className="cursor-pointer rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-text-hi"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "none" && links.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("link")}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 font-heading font-medium text-text-hi transition-colors duration-150 hover:border-volt/40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add link
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            aria-label="Add email"
            title="Add email"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 text-text-hi transition-colors duration-150 hover:border-volt/40"
          >
            <Mail className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
