import { Suspense } from "@suspensive/react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import PostLoading from "./loading";
import { PostPage } from "./PostPage";
import { getCommentsBySlug, getPostBySlug } from "~/lib/actions/post";
import { getQueryClient } from "~/lib/getQueryClient";
import { getPostBySlug as getPublicPostBySlug } from "~/lib/models/post";
import { createExcerpt, getAbsoluteUrl, SITE_NAME, stringifyJsonLd } from "~/lib/seo";

import type { Metadata } from "next";

type PostPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);

  if (!post) {
    return {
      title: "글을 찾을 수 없음",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const url = getAbsoluteUrl(`/post/${post.slug}`);
  const description = createExcerpt(post.content);
  const images = post.banner ? [post.banner.url] : undefined;

  return {
    title: post.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      url,
      siteName: SITE_NAME,
      title: post.title,
      description,
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.user.name],
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images,
    },
  };
}

export default async function PostIdPage({ params }: PostPageProps) {
  const { slug } = await params;
  const queryClient = getQueryClient();
  const publicPost = await getPublicPostBySlug(slug);

  queryClient.prefetchQuery({
    queryKey: ["post", slug] as const,
    queryFn: () => getPostBySlug(slug),
  });
  queryClient.prefetchQuery({
    queryKey: ["post-comments", slug] as const,
    queryFn: () => getCommentsBySlug(slug),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {publicPost && <PostJsonLd post={publicPost} />}
      <Suspense fallback={<PostLoading />}>
        <PostPage slug={slug} />
      </Suspense>
    </HydrationBoundary>
  );
}

function PostJsonLd({
  post,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getPublicPostBySlug>>>;
}) {
  const url = getAbsoluteUrl(`/post/${post.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: createExcerpt(post.content),
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": "Person",
      name: post.user.name,
      url: getAbsoluteUrl(`/users/${post.user.username}`),
    },
    publisher: {
      "@type": "Person",
      name: post.user.name,
    },
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.banner ? [post.banner.url] : undefined,
    articleSection: post.category?.name,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
    />
  );
}
