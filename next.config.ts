import type { NextConfig } from "next";

// Legacy PHP website URLs → new routes, so existing links and search results keep working
const LEGACY_PAGES: Record<string, string> = {
  "index": "/",
  "home": "/",
  "about": "/about",
  "company-history": "/company-history",
  "partners": "/partners",
  "testimonials": "/testimonials",
  "services": "/services",
  "portfolio": "/gallery",
  "quote": "/quote",
  "contact": "/contact",
  "services-detail": "/services/packaged-goods-transport",
  "services-detail-v2": "/services/air-charter-flights",
  "services-detail-v3": "/services/sea-and-air-freight",
  "services-detail-v4": "/services/logistics-solutions",
  "services-detail-v5": "/services/warehousing-and-storage",
  "services-detail-v6": "/services/forwarding-services",
  "services-detail-v7": "/services/it-services",
};

const nextConfig: NextConfig = {
  // The Next.js "N" badge (development only) sits top left, clear of the WhatsApp and back-to-top buttons
  devIndicators: { position: "top-left" },
  async redirects() {
    return Object.entries(LEGACY_PAGES).flatMap(([page, destination]) =>
      [`/${page}.php`, `/${page}.html`, ...(destination === `/${page}` ? [] : [`/${page}`])].map(source => ({
        source,
        destination,
        permanent: true,
      }))
    );
  },
};

export default nextConfig;
