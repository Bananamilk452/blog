export const SITE_NAME = "윤서아의 블로그";
export const SITE_DESCRIPTION =
  "종이 위에 메모를 쌓아두듯, 천천히 읽고 오래 남는 글들을 정리하는 공간입니다.";

export function getSiteUrl() {
  return (process.env.PUBLIC_URL || "https://seoa.dev").replace(/\/$/, "");
}

export function getAbsoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function createExcerpt(html: string, maxLength = 160) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function stringifyJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
