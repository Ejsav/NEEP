import { permanentRedirect } from "next/navigation";

/**
 * /start was the original inquiry route and is now the planner at /plan.
 *
 * Kept as a permanent redirect rather than deleted: it is the URL that has been
 * live, so anything already pointing at it - a link, a bookmark, an early
 * crawler - must land somewhere real rather than on a 404. 308 preserves the
 * method, and tells search engines to move their index over.
 */
export default function StartPage(): never {
  permanentRedirect("/plan");
}
