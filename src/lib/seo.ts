export const SITE_URL = "https://blob-gang.lovable.app";
export const SITE_NAME = "Blob Gang";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

type SeoInput = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** Emit a canonical link (only for indexable leaf pages). */
  canonical?: boolean;
};

/** Per-route head(): title, description, Open Graph, Twitter card, robots, canonical. */
export function seo({ title, description, path, noindex, canonical = !noindex }: SeoInput) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Six jelly blobs racing along wavy lanes under the words Blob Gang: Type fast. Squish faster." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: canonical ? [{ rel: "canonical", href: url }] : [],
  };
}
