/**
 * Attribution model.
 *
 * Runs in middleware (edge runtime) as well as in server actions, so this module
 * must stay free of Node built-ins and of `server-only`.
 */

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

/** Ad-platform click identifiers, in the order we prefer them. */
export const CLICK_ID_KEYS = [
  ["gclid", "google"],
  ["gbraid", "google"],
  ["wbraid", "google"],
  ["msclkid", "microsoft"],
  ["fbclid", "meta"],
  ["ttclid", "tiktok"],
  ["li_fat_id", "linkedin"],
] as const;

export type Touch = {
  /** Epoch seconds. Short key names keep the cookie small. */
  t: number;
  /** Landing path, query string stripped. */
  p?: string;
  /** Full referrer, capped. */
  r?: string;
  /** Referrer hostname. */
  rh?: string;
  us?: string;
  um?: string;
  uc?: string;
  ut?: string;
  un?: string;
  /** Click id value. */
  ci?: string;
  /** Click id platform. */
  cs?: string;
};

export type VisitorState = {
  /** Opaque visit id. */
  sid: string;
  /** Number of distinct visits recorded. */
  n: number;
};

export const COOKIE_FIRST_TOUCH = "neep_ft";
export const COOKIE_LAST_TOUCH = "neep_lt";
export const COOKIE_VISITOR = "neep_v";

export const FIRST_TOUCH_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
export const LAST_TOUCH_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

/** Hard caps so a hostile query string cannot bloat a cookie or a DB row. */
const MAX_FIELD = 200;
const MAX_REFERRER = 500;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

function clean(
  value: string | null | undefined,
  max = MAX_FIELD,
): string | undefined {
  if (!value) return undefined;
  // Strip control characters; they have no legitimate place in these values.
  const stripped = value.replace(CONTROL_CHARS, "").trim();
  if (stripped === "") return undefined;
  return stripped.slice(0, max);
}

/** Builds a Touch from an inbound request's URL and Referer header. */
export function buildTouch(
  url: URL,
  referrer: string | null,
  selfHost: string,
): Touch {
  const params = url.searchParams;
  const touch: Touch = { t: Math.floor(Date.now() / 1000) };

  const path = clean(url.pathname);
  if (path) touch.p = path;

  const ref = clean(referrer, MAX_REFERRER);
  if (ref) {
    let refHost: string | undefined;
    try {
      refHost = new URL(ref).hostname.toLowerCase();
    } catch {
      refHost = undefined;
    }
    // Internal navigation is not a marketing touch.
    if (refHost && refHost !== selfHost.toLowerCase()) {
      touch.r = ref;
      touch.rh = refHost;
    }
  }

  touch.us = clean(params.get("utm_source"));
  touch.um = clean(params.get("utm_medium"));
  touch.uc = clean(params.get("utm_campaign"));
  touch.ut = clean(params.get("utm_term"));
  touch.un = clean(params.get("utm_content"));

  for (const [key, source] of CLICK_ID_KEYS) {
    const value = clean(params.get(key));
    if (value) {
      touch.ci = value;
      touch.cs = source;
      break;
    }
  }

  return touch;
}

/** True when a touch carries campaign intent worth overwriting last-touch for. */
export function isAttributableTouch(touch: Touch): boolean {
  return Boolean(touch.us || touch.um || touch.uc || touch.ci || touch.rh);
}

export function encodeTouch(touch: Touch): string {
  return encodeURIComponent(JSON.stringify(touch));
}

/**
 * Decodes a cookie value. Cookies are HttpOnly but not signed, so every field is
 * re-validated here rather than trusted. See docs/DECISIONS.md.
 */
export function decodeTouch(raw: string | undefined): Touch | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const input = parsed as Record<string, unknown>;
    const t =
      typeof input.t === "number" && Number.isFinite(input.t) ? input.t : 0;
    const str = (key: string, max = MAX_FIELD) =>
      typeof input[key] === "string"
        ? clean(input[key] as string, max)
        : undefined;
    return {
      t,
      p: str("p"),
      r: str("r", MAX_REFERRER),
      rh: str("rh"),
      us: str("us"),
      um: str("um"),
      uc: str("uc"),
      ut: str("ut"),
      un: str("un"),
      ci: str("ci"),
      cs: str("cs"),
    };
  } catch {
    return undefined;
  }
}

export function encodeVisitor(state: VisitorState): string {
  return encodeURIComponent(JSON.stringify(state));
}

export function decodeVisitor(raw: string | undefined): VisitorState | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const input = parsed as Record<string, unknown>;
    const sid = typeof input.sid === "string" ? clean(input.sid, 64) : undefined;
    const n =
      typeof input.n === "number" && Number.isFinite(input.n) ? input.n : 1;
    if (!sid) return undefined;
    return { sid, n: Math.min(Math.max(Math.floor(n), 1), 100000) };
  } catch {
    return undefined;
  }
}
