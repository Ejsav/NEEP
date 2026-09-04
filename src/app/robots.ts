import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * The admin area is disallowed here as hygiene, not as a control. It is
 * protected by authentication and is also noindex'd at the route level; robots
 * .txt is a request to well-behaved crawlers, never a security boundary.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
