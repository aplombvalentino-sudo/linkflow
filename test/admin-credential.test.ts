// Risk #3 — the Admin private key is read only from server-only env, restores
// newlines, fails fast when missing, and never appears under NEXT_PUBLIC_.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAdminCredentialConfig } from "@/lib/firebase/admin";
import { firebaseWebConfig } from "@/lib/firebase/config";

const KEYS = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  process.env.FIREBASE_PROJECT_ID = "proj";
  process.env.FIREBASE_CLIENT_EMAIL = "svc@proj.iam.gserviceaccount.com";
  process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN-----\\nLINE\\n-----END-----\\n";
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getAdminCredentialConfig (risk #3)", () => {
  it("reads server-only env and restores literal \\n to real newlines", () => {
    const cfg = getAdminCredentialConfig();
    expect(cfg.projectId).toBe("proj");
    expect(cfg.clientEmail).toBe("svc@proj.iam.gserviceaccount.com");
    expect(cfg.privateKey).toBe("-----BEGIN-----\nLINE\n-----END-----\n");
    expect(cfg.privateKey).not.toContain("\\n");
  });

  it("throws a clear error when the private key is missing", () => {
    delete process.env.FIREBASE_PRIVATE_KEY;
    expect(() => getAdminCredentialConfig()).toThrow(/FIREBASE_PRIVATE_KEY/);
  });

  it("never exposes the private key via NEXT_PUBLIC / web config", () => {
    expect(process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY).toBeUndefined();
    expect(Object.keys(firebaseWebConfig)).not.toContain("privateKey");
    for (const v of Object.values(firebaseWebConfig)) {
      expect(String(v ?? "")).not.toContain("PRIVATE KEY");
    }
  });
});
