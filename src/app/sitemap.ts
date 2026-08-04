import type { MetadataRoute } from "next";

const SITE_URL = "https://durak-tracker.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/data-deletion`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
