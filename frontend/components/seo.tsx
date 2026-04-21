"use client";

import Head from "next/head";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
  tags?: string[];
}

const SITE_NAME = "Aston's Blog";
const DEFAULT_DESCRIPTION = "技术博客，记录成长，分享技术心得与生活感悟";
const DEFAULT_IMAGE = "/og-image.jpg";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blog.example.com";

export function SEO({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
  author,
  tags,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullDescription = description || DEFAULT_DESCRIPTION;
  const fullImage = image || `${SITE_URL}${DEFAULT_IMAGE}`;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={fullDescription} />
      {tags && tags.length > 0 && (
        <meta name="keywords" content={tags.join(", ")} />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={fullDescription} />
      <meta property="twitter:image" content={fullImage} />

      {/* Article specific */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" &&
        tags &&
        tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

      {/* RSS Autodiscovery */}
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${SITE_NAME} RSS Feed`}
        href={`${SITE_URL}/rss.xml`}
      />

      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
    </Head>
  );
}

// Hook for dynamic SEO updates
export function useSEO(props: SEOProps) {
  return <SEO {...props} />;
}
