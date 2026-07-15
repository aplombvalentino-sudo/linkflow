// Risks #1/#2 — Firestore rules field-validate profile + link updates. A full
// emulator test is the gold standard, but the emulator (Java + downloads) isn't
// available in this environment, so this guards the rule CONTENT: it asserts the
// key validation constraints are present, and fails if they regress/are removed.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rules = readFileSync(
  fileURLToPath(new URL("../firestore.rules", import.meta.url)),
  "utf8",
).replace(/\s+/g, " ");

describe("profiles update rule is field-validated (risk #1)", () => {
  it("restricts updatable fields via affectedKeys().hasOnly", () => {
    expect(rules).toContain("request.resource.data.diff(resource.data).affectedKeys()");
    expect(rules).toContain(
      ".hasOnly(['displayName', 'bio', 'theme', 'isPublished', 'updatedAt'])",
    );
  });
  it("pins immutable identity fields", () => {
    expect(rules).toContain("request.resource.data.userId == resource.data.userId");
    expect(rules).toContain("request.resource.data.handle == resource.data.handle");
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
      ".hasOnly(['title', 'url', 'thumbnailUrl', 'position', 'isActive', 'updatedAt'])",
    );
    // clickCount must NOT be client-editable
    expect(rules).not.toContain("'clickCount', 'updatedAt'])");
  });
  it("type/size checks the content fields", () => {
    expect(rules).toContain("request.resource.data.title is string");
    expect(rules).toContain("request.resource.data.title.size() <= 120");
    expect(rules).toContain("request.resource.data.url.size() <= 2048");
    expect(rules).toContain("request.resource.data.isActive is bool");
    expect(rules).toContain("request.resource.data.position is int");
  });
});
