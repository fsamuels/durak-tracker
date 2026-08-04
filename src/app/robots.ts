import type { MetadataRoute } from "next";

const SITE_URL = "https://durak-tracker.vercel.app";

// Everything except the marketing/legal pages sits behind auth (the
// middleware bounces a signed-out crawler to /login anyway), so there's no
// SEO value in letting crawlers spend budget on them — and /claim URLs
// specifically carry single-use tokens that must never end up indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/onboarding",
        "/account",
        "/admin",
        "/games",
        "/group",
        "/players",
        "/stats",
        "/claim",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
