import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const target = import.meta.env.PUBLIC_SITE_TARGET || "marketing";

  if (target === "admin") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const body = `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site)}\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
};
