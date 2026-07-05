export const dynamic = "force-dynamic";
export const revalidate = 3600;

import { getPublishedPostSitemapEntries } from "~/lib/models/post";
import { getAbsoluteUrl } from "~/lib/seo";

import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPostSitemapEntries();

  return [
    {
      url: getAbsoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...posts.flatMap((post) =>
      post.slug
        ? [
            {
              url: getAbsoluteUrl(`/post/${post.slug}`),
              lastModified: post.updatedAt,
              changeFrequency: "weekly" as const,
              priority: 0.8,
            },
          ]
        : [],
    ),
  ];
}
