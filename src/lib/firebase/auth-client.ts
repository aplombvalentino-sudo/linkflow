"use client";

// Client-side auth orchestration used by AuthCard. Centralizes demo-mode
// detection through the shared `isFirebaseConfigured` flag (risk #8) and does
// REAL Firebase authentication + session-cookie exchange when configured
// (risk #1) — no more "pretend authenticated" demo submit.
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./client";

export type AuthMode = "login" | "signup";

export interface SubmitInput {
  mode: AuthMode;
  email: string;
  password: string;
  handle?: string;
  turnstileToken?: string;
}

export interface SubmitResult {
  ok: boolean;
  /** "demo" when Firebase isn't configured; otherwise an error code. */
  code?: string;
  message?: string;
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-email": "That email doesn't look right.",
  "auth/user-not-found": "No account with that email.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/email-already-in-use": "That email already has an account — log in instead.",
  "auth/weak-password": "Use at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Try again in a bit.",
  "handle-taken": "That handle's taken — pick another.",
  "invalid-input": "Check your details and try again.",
  "bot-check-failed": "Verification failed — refresh and try again.",
};

function messageFor(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Try again.";
}

/** Authenticate against Firebase, then exchange the ID token for an httpOnly
 *  session cookie. Returns { ok:false, code:"demo" } when Firebase isn't
 *  configured, so callers keep the demo notice without faking a login. */
export async function submitAuth(input: SubmitInput): Promise<SubmitResult> {
  if (!isFirebaseConfigured) return { ok: false, code: "demo" };

  try {
    const cred =
      input.mode === "signup"
        ? await createUserWithEmailAndPassword(auth, input.email, input.password)
        : await signInWithEmailAndPassword(auth, input.email, input.password);

    const idToken = await cred.user.getIdToken();
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        handle: input.mode === "signup" ? input.handle : undefined,
        turnstileToken: input.turnstileToken,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const code = typeof data.error === "string" ? data.error : "auth-failed";
      return { ok: false, code, message: messageFor(code) };
    }
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "auth-failed";
    return { ok: false, code, message: messageFor(code) };
  }
}
