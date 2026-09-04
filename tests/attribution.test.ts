import { describe, expect, it } from "vitest";
import {
  buildTouch,
  decodeTouch,
  decodeVisitor,
  encodeTouch,
  encodeVisitor,
  isAttributableTouch,
} from "@/lib/attribution/types";

const SELF = "newenglandeventplanners.com";

function url(path: string): URL {
  return new URL(`https://${SELF}${path}`);
}

describe("buildTouch", () => {
  it("records the landing path", () => {
    const touch = buildTouch(url("/start"), null, SELF);
    expect(touch.p).toBe("/start");
  });

  it("captures all five UTM parameters", () => {
    const touch = buildTouch(
      url(
        "/?utm_source=google&utm_medium=cpc&utm_campaign=ct-weddings" +
          "&utm_term=wedding+planner&utm_content=headline-a",
      ),
      null,
      SELF,
    );
    expect(touch.us).toBe("google");
    expect(touch.um).toBe("cpc");
    expect(touch.uc).toBe("ct-weddings");
    expect(touch.ut).toBe("wedding planner");
    expect(touch.un).toBe("headline-a");
  });

  it("captures a click id with its platform", () => {
    const touch = buildTouch(url("/?gclid=abc123"), null, SELF);
    expect(touch.ci).toBe("abc123");
    expect(touch.cs).toBe("google");
  });

  it("prefers the first click id in priority order", () => {
    const touch = buildTouch(url("/?fbclid=meta1&gclid=goog1"), null, SELF);
    expect(touch.cs).toBe("google");
  });

  it("records an external referrer with its host", () => {
    const touch = buildTouch(url("/"), "https://www.theknot.com/vendors", SELF);
    expect(touch.rh).toBe("www.theknot.com");
    expect(touch.r).toBe("https://www.theknot.com/vendors");
  });

  it("ignores our own site as a referrer", () => {
    const touch = buildTouch(url("/start"), `https://${SELF}/`, SELF);
    expect(touch.rh).toBeUndefined();
    expect(touch.r).toBeUndefined();
  });

  it("survives a malformed referrer header", () => {
    const touch = buildTouch(url("/"), "not a url at all", SELF);
    expect(touch.rh).toBeUndefined();
  });

  it("caps oversized parameter values", () => {
    const touch = buildTouch(
      url(`/?utm_campaign=${"x".repeat(5000)}`),
      null,
      SELF,
    );
    expect(touch.uc?.length).toBeLessThanOrEqual(200);
  });

  it("strips control characters from parameter values", () => {
    const touch = buildTouch(url("/?utm_source=goo%00gle"), null, SELF);
    expect(touch.us).toBe("google");
  });
});

describe("isAttributableTouch", () => {
  it("treats a direct visit with no parameters as non-attributable", () => {
    expect(isAttributableTouch(buildTouch(url("/"), null, SELF))).toBe(false);
  });

  it("treats a UTM-tagged visit as attributable", () => {
    expect(
      isAttributableTouch(buildTouch(url("/?utm_source=google"), null, SELF)),
    ).toBe(true);
  });

  it("treats an externally referred visit as attributable", () => {
    expect(
      isAttributableTouch(buildTouch(url("/"), "https://www.google.com/", SELF)),
    ).toBe(true);
  });

  it("treats a click-id-only visit as attributable", () => {
    expect(isAttributableTouch(buildTouch(url("/?msclkid=x1"), null, SELF))).toBe(
      true,
    );
  });
});

describe("cookie codec", () => {
  it("round-trips a full touch", () => {
    const original = buildTouch(
      url("/start?utm_source=google&utm_medium=cpc&gclid=xyz"),
      "https://www.google.com/search",
      SELF,
    );
    const decoded = decodeTouch(encodeTouch(original));
    expect(decoded?.us).toBe("google");
    expect(decoded?.um).toBe("cpc");
    expect(decoded?.ci).toBe("xyz");
    expect(decoded?.rh).toBe("www.google.com");
    expect(decoded?.p).toBe("/start");
  });

  it("returns undefined for junk rather than throwing", () => {
    for (const bad of [undefined, "", "not-json", "%%%", "[1,2,3]", "null"]) {
      expect(() => decodeTouch(bad)).not.toThrow();
    }
    expect(decodeTouch("not-json")).toBeUndefined();
  });

  it("re-validates a hand-crafted cookie instead of trusting it", () => {
    // Cookies are HttpOnly but unsigned. Oversized fields must be truncated and
    // non-string fields dropped, not written through to the database.
    const hostile = encodeURIComponent(
      JSON.stringify({
        t: "not-a-number",
        us: "y".repeat(9000),
        um: { nested: "object" },
        p: "/ok",
      }),
    );
    const decoded = decodeTouch(hostile);
    expect(decoded?.t).toBe(0);
    expect(decoded?.us?.length).toBeLessThanOrEqual(200);
    expect(decoded?.um).toBeUndefined();
    expect(decoded?.p).toBe("/ok");
  });

  it("round-trips visitor state", () => {
    const decoded = decodeVisitor(encodeVisitor({ sid: "abc-123", n: 4 }));
    expect(decoded).toEqual({ sid: "abc-123", n: 4 });
  });

  it("clamps an absurd visit count", () => {
    const hostile = encodeURIComponent(
      JSON.stringify({ sid: "abc", n: 999999999 }),
    );
    expect(decodeVisitor(hostile)?.n).toBe(100000);
  });

  it("rejects visitor state with no session id", () => {
    expect(decodeVisitor(encodeURIComponent(JSON.stringify({ n: 2 })))).toBeUndefined();
  });
});
