// Risks #1/#2 — Firestore rules field-validate profile + link updates. A full
// emulator test is the gold standard, but the emulator (Java + downloads) isn't
// available in this environment, so this guards the rule CONTENT: it asserts the
// key validation constraints are present, and fails if they regress/are removed.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rawRules = readFileSync(
  fileURLToPath(new URL("../firestore.rules", import.meta.url)),
  "utf8",
);
const rules = rawRules.replace(/\s+/g, " ");

/** Extract just the `match /<name>/{...}` block's body for precise, non-false-
 *  positive assertions (rather than searching the whole flattened file). */
function ruleBlock(matchPath: string): string {
  const header = `match /${matchPath}`;
  const start = rawRules.indexOf(header);
  if (start === -1) throw new Error(`No "match /${matchPath}" block found`);
  // Search for the body-opening "{" AFTER the header text — matchPath itself
  // contains literal braces (e.g. "{uid}"), so searching from `start` would
  // find that brace instead of the rule body's.
  let depth = 0;
  let i = rawRules.indexOf("{", start + header.length);
  const bodyStart = i;
  for (; i < rawRules.length; i++) {
    if (rawRules[i] === "{") depth++;
    else if (rawRules[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return rawRules.slice(bodyStart, i + 1).replace(/\s+/g, " ");
}

describe("users/{uid} update/delete are fully locked (billing self-upgrade gap)", () => {
  it("allows the owner to read and create their own doc", () => {
    const block = ruleBlock("users/{uid}");
    expect(block).toContain("allow read: if isOwner(uid)");
    expect(block).toContain("allow create: if isOwner(uid)");
  });
  it("denies ALL client updates and deletes — plan/stripeCustomerId are server-only", () => {
    const block = ruleBlock("users/{uid}");
    expect(block).toContain("allow update, delete: if false");
    // the old unrestricted rule must be gone, not just supplemented
    expect(block).not.toMatch(/allow\s+read,\s*update:\s*if\s+isOwner/);
  });
});

describe("profiles update rule is field-validated (risk #1)", () => {
  it("restricts updatable fields via affectedKeys().hasOnly", () => {
    expect(rules).toContain("request.resource.data.diff(resource.data).affectedKeys()");
    expect(rules).toContain(
      ".hasOnly(['displayName', 'bio', 'theme', 'isPublished', 'avatarUrl', 'backgroundStyle', 'backgroundImageUrl', 'backgroundColor', 'updatedAt'])",
    );
  });
  it("pins immutable identity fields, including handleLower", () => {
    expect(rules).toContain("request.resource.data.userId == resource.data.userId");
    expect(rules).toContain("request.resource.data.handle == resource.data.handle");
    expect(rules).toContain("request.resource.data.handleLower == resource.data.handleLower");
  });
  it("hard-denies handleLower/handle/userId/createdAt from ever appearing in an update diff", () => {
    // Explicit, redundant guard on top of the equality pins + hasOnly list —
    // fails closed even if a future edit weakens one of those (risk #1).
    expect(rules).toContain("!request.resource.data.diff(resource.data).affectedKeys()");
    expect(rules).toContain(".hasAny(['handleLower', 'handle', 'userId', 'createdAt'])");
  });
  it("type/size checks the content fields", () => {
    expect(rules).toContain("request.resource.data.displayName is string");
    expect(rules).toContain("request.resource.data.displayName.size() <= 80");
    expect(rules).toContain("request.resource.data.bio.size() <= 300");
    expect(rules).toContain("request.resource.data.theme in ['volt', 'violet-hour', 'ember']");
    expect(rules).toContain("request.resource.data.isPublished is bool");
  });
});

describe("links update rule is field-validated (risk #2)", () => {
  it("restricts updatable fields and excludes clickCount (server-only)", () => {
    expect(rules).toContain(
      ".hasOnly(['title', 'url', 'thumbnailUrl', 'meta', 'position', 'isActive', 'updatedAt'])",
    );
    // clickCount must NOT be client-editable
    expect(rules).not.toContain("clickCount'");
  });
  it("type/size checks the content fields", () => {
    expect(rules).toContain("request.resource.data.title is string");
    expect(rules).toContain("request.resource.data.title.size() <= 120");
    expect(rules).toContain("request.resource.data.url.size() <= 2048");
    expect(rules).toContain("request.resource.data.isActive is bool");
    expect(rules).toContain("request.resource.data.position is int");
  });
});
