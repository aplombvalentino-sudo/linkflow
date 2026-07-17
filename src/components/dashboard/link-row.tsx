"use client";

// One link in the manager. Collapsed: grip, title, host, click stat, plus
// visibility / edit / delete / move controls. Expanded: inline title/url/meta
// editor. All persistence goes through updateLink/deleteLink; on success we push
// the change up so the parent state (and the live preview) stays in sync.
import { useState } from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { LinkDoc } from "@/lib/firebase/data";
import { hostFromUrl } from "@/lib/card-mapper";
import { updateLink, deleteLink } from "@/lib/actions/link-actions";

interface Props {
  link: LinkDoc;
  onUpdate: (patch: Partial<LinkDoc>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function LinkRow({
  link,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [meta, setMeta] = useState(link.meta);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setError(null);
    const next = !link.isActive;
    const res = await updateLink(link.id, { isActive: next });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onUpdate({ isActive: next });
  }

  async function saveEdits() {
    setError(null);
    if (!title.trim() || !url.trim()) {
      setError("Give it a title and a link.");
      return;
    }
    setBusy(true);
    const res = await updateLink(link.id, { title, url, meta });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    // Adopt the server-normalized values (https:// added, trimmed) so the row,
    // the preview, and Firestore all agree without waiting for a refresh.
    const saved = {
      title: res.title ?? title,
      url: res.url ?? url,
      meta: res.meta ?? meta,
    };
    setTitle(saved.title);
    setUrl(saved.url);
    setMeta(saved.meta);
    onUpdate(saved);
    setEditing(false);
  }

  async function remove() {
    setError(null);
    setBusy(true);
    const res = await deleteLink(link.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onDelete();
  }

  const inputCls =
    "w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-text-hi outline-none transition-colors placeholder:text-text-lo/60 focus:border-volt/50";

  return (
    <li className="tile rounded-2xl px-3 py-3">
      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Link title"
            aria-label="Link title"
            className={inputCls}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            aria-label="Link URL"
            className={inputCls}
          />
          <input
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder="Optional note (e.g. Most popular)"
            aria-label="Link note"
            className={inputCls}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdits}
              disabled={busy}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-volt px-5 font-heading text-sm font-semibold text-ink-950 transition-[filter] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(link.title);
                setUrl(link.url);
                setMeta(link.meta);
                setError(null);
                setEditing(false);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-lo transition-colors hover:text-text-hi"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Move link up"
              className="cursor-pointer text-text-lo transition-colors hover:text-text-hi disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Move link down"
              className="cursor-pointer text-text-lo transition-colors hover:text-text-hi disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <GripVertical className="h-4 w-4 shrink-0 text-text-lo/50" aria-hidden />

          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm font-medium ${
                link.isActive ? "text-text-hi" : "text-text-lo line-through"
              }`}
            >
              {link.title}
            </p>
            <p className="truncate font-mono text-[11px] uppercase tracking-wide text-text-lo">
              {hostFromUrl(link.url) || link.url} · {link.clickCount} clicks
            </p>
          </div>

          <button
            type="button"
            onClick={toggleActive}
            aria-label={link.isActive ? "Hide link" : "Show link"}
            aria-pressed={link.isActive}
            className="cursor-pointer rounded-full p-2 text-text-lo transition-colors hover:text-text-hi"
          >
            {link.isActive ? (
              <Eye className="h-4 w-4" aria-hidden />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit link"
            className="cursor-pointer rounded-full p-2 text-text-lo transition-colors hover:text-text-hi"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Delete link"
            className="cursor-pointer rounded-full p-2 text-text-lo transition-colors hover:text-danger disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
