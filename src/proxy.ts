import { NextResponse, type NextRequest } from "next/server";
import {
  buildTouch,
  COOKIE_FIRST_TOUCH,
  COOKIE_LAST_TOUCH,
  COOKIE_VISITOR,
  decodeTouch,
  decodeVisitor,
  encodeTouch,
  encodeVisitor,
  FIRST_TOUCH_MAX_AGE,
  isAttributableTouch,
  LAST_TOUCH_MAX_AGE,
  VISITOR_MAX_AGE,
} from "@/lib/attribution/types";

/**
 * Attribution capture. Runs before every document request.
 *
 * Server-side and cookie-based so it works with JavaScript disabled and is not
 * defeated by content blockers. No third party is contacted and no cross-site
 * identifier is set.
 *
 * Model:
 *   first touch  - written once, never overwritten. How they found us, ever.
 *   last touch   - overwritten only by a visit that carries campaign intent
 *                  (a UTM, a click id, or an external referrer). A later direct
 *                  visit does not erase the campaign that actually drove them.
 *   visitor      - opaque visit id and a count of distinct visits.
 */

const VISIT_GAP_MS = 30 * 60 * 1000;

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const url = request.nextUrl;
  const selfHost = url.hostname;
  const touch = buildTouch(url, request.headers.get("referer"), selfHost);

  const cookies = request.cookies;
  const existingFirst = decodeTouch(cookies.get(COOKIE_FIRST_TOUCH)?.value);
  const existingLast = decodeTouch(cookies.get(COOKIE_LAST_TOUCH)?.value);
  const visitor = decodeVisitor(cookies.get(COOKIE_VISITOR)?.value);

  const secure = url.protocol === "https:";
  const base = {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  } as const;

  if (!existingFirst) {
    response.cookies.set(COOKIE_FIRST_TOUCH, encodeTouch(touch), {
      ...base,
      maxAge: FIRST_TOUCH_MAX_AGE,
    });
  }

  // Overwrite last touch only for a visit that actually carries campaign intent.
  if (isAttributableTouch(touch) || !existingLast) {
    response.cookies.set(COOKIE_LAST_TOUCH, encodeTouch(touch), {
      ...base,
      maxAge: LAST_TOUCH_MAX_AGE,
    });
  }

  const nowMs = Date.now();
  const lastSeenMs = (existingLast?.t ?? 0) * 1000;
  const isNewVisit = !visitor || nowMs - lastSeenMs > VISIT_GAP_MS;

  if (isNewVisit) {
    response.cookies.set(
      COOKIE_VISITOR,
      encodeVisitor({
        sid: crypto.randomUUID(),
        n: (visitor?.n ?? 0) + 1,
      }),
      { ...base, maxAge: VISITOR_MAX_AGE },
    );
  }

  return response;
}

export const config = {
  /**
   * Document requests only. Excluding static assets and the image optimizer
   * keeps this off the hot path for anything that is not a page view.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|txt|xml)$).*)",
  ],
};
