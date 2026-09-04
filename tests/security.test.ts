import { describe, expect, it } from "vitest";
import {
  hashIp,
  hashPassword,
  hmac,
  newSessionToken,
  safeEqual,
  verifyPassword,
} from "@/lib/security/hash";
import {
  honeypotTripped,
  issueFormToken,
  verifyFormToken,
} from "@/lib/security/form-token";
import { generateReference, isValidReference } from "@/lib/inquiries/reference";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(false);
  });

  it("produces a different hash each time for the same password", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("never stores the password in the hash string", async () => {
    const stored = await hashPassword("plaintext-should-not-appear");
    expect(stored).not.toContain("plaintext-should-not-appear");
  });

  it("returns false rather than throwing on a malformed stored hash", async () => {
    for (const bad of ["", "notahash", "scrypt$bad", "argon2$1$2$3$4$5"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });

  it("treats unicode-equivalent passwords consistently", async () => {
    // The same character composed two ways must not lock a user out.
    const stored = await hashPassword("café-password");
    expect(await verifyPassword("café-password", stored)).toBe(true);
  });
});

describe("form tokens", () => {
  const scope = "inquiry";

  it("accepts a token submitted after a human-plausible delay", () => {
    const issuedAt = new Date();
    const token = issueFormToken(scope, issuedAt);
    const later = new Date(issuedAt.getTime() + 10_000);
    expect(verifyFormToken(token, scope, later)).toEqual({ ok: true });
  });

  it("rejects a token submitted instantly", () => {
    const issuedAt = new Date();
    const token = issueFormToken(scope, issuedAt);
    const result = verifyFormToken(token, scope, new Date(issuedAt.getTime() + 50));
    expect(result).toEqual({ ok: false, reason: "too_fast" });
  });

  it("rejects a stale token", () => {
    const issuedAt = new Date();
    const token = issueFormToken(scope, issuedAt);
    const muchLater = new Date(issuedAt.getTime() + 13 * 60 * 60 * 1000);
    expect(verifyFormToken(token, scope, muchLater)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a token minted for a different form", () => {
    const issuedAt = new Date();
    const token = issueFormToken("admin-login", issuedAt);
    const later = new Date(issuedAt.getTime() + 10_000);
    expect(verifyFormToken(token, scope, later).ok).toBe(false);
  });

  it("rejects a tampered timestamp", () => {
    const issuedAt = new Date();
    const token = issueFormToken(scope, issuedAt);
    const parts = token.split(".");
    // Rewind the clock to defeat the timing check - the signature must catch it.
    parts[1] = String(issuedAt.getTime() - 60_000);
    const result = verifyFormToken(parts.join("."), scope, new Date());
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a tampered signature", () => {
    const issuedAt = new Date();
    const token = issueFormToken(scope, issuedAt);
    const parts = token.split(".");
    parts[3] = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const later = new Date(issuedAt.getTime() + 10_000);
    expect(verifyFormToken(parts.join("."), scope, later).ok).toBe(false);
  });

  it("rejects missing and malformed tokens", () => {
    for (const bad of [undefined, null, "", "a.b.c", "a.b.c.d.e"]) {
      expect(verifyFormToken(bad, scope).ok).toBe(false);
    }
  });

  it("tolerates a client clock running ahead", () => {
    const issuedAt = new Date();
    const token = issueFormToken(scope, issuedAt);
    // Server "now" earlier than issue time: skew, not an attack.
    const earlier = new Date(issuedAt.getTime() - 5_000);
    expect(verifyFormToken(token, scope, earlier)).toEqual({ ok: true });
  });
});

describe("honeypot", () => {
  it("ignores an empty or absent value", () => {
    expect(honeypotTripped(null)).toBe(false);
    expect(honeypotTripped("")).toBe(false);
    expect(honeypotTripped("   ")).toBe(false);
  });

  it("trips on any real value", () => {
    expect(honeypotTripped("http://spam.example")).toBe(true);
  });
});

describe("keyed hashing", () => {
  it("hashes an IP deterministically without keeping the address", () => {
    const a = hashIp("203.0.113.44");
    const b = hashIp("203.0.113.44");
    expect(a).toBe(b);
    expect(a).not.toContain("203.0.113.44");
    expect(a).toHaveLength(32);
  });

  it("gives different IPs different hashes", () => {
    expect(hashIp("203.0.113.44")).not.toBe(hashIp("203.0.113.45"));
  });

  it("passes through a missing IP", () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp(undefined)).toBeNull();
  });

  it("produces a stable HMAC", () => {
    expect(hmac("abc")).toBe(hmac("abc"));
    expect(hmac("abc")).not.toBe(hmac("abd"));
  });
});

describe("constant-time comparison", () => {
  it("matches equal strings and rejects unequal ones", () => {
    expect(safeEqual("abcdef", "abcdef")).toBe(true);
    expect(safeEqual("abcdef", "abcdeg")).toBe(false);
  });

  it("returns false for different lengths rather than throwing", () => {
    expect(safeEqual("abc", "abcdef")).toBe(false);
  });
});

describe("session tokens", () => {
  it("generates unique, high-entropy tokens", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => newSessionToken()));
    expect(tokens.size).toBe(500);
    expect(newSessionToken().length).toBeGreaterThanOrEqual(43);
  });
});

describe("inquiry references", () => {
  it("generates references in the expected shape", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(isValidReference(generateReference())).toBe(true);
    }
  });

  it("omits characters that are ambiguous when read aloud", () => {
    const sample = Array.from({ length: 500 }, () => generateReference()).join("");
    for (const ambiguous of ["I", "L", "O", "U"]) {
      expect(sample.slice(5)).not.toContain(ambiguous);
    }
  });

  it("rejects malformed references", () => {
    for (const bad of ["NEEP-", "NEEP-ABC", "neep-ABC123", "ABC123", "NEEP-ABCDEFG"]) {
      expect(isValidReference(bad)).toBe(false);
    }
  });
});
