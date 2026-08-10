import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Compression is handled by the reverse proxy in front of this app. Next's
  // own gzip/brotli layer has a known Node zlib native crash when a large
  // response (e.g. a PDF download) is aborted/retried mid-stream.
  compress: false,
  serverExternalPackages: ["@prisma/client", "prisma", "pdfkit"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.prisma/client/**/*", "./node_modules/pdfkit/js/data/**/*"],
    "/api/**/*": ["./node_modules/.prisma/client/**/*", "./node_modules/pdfkit/js/data/**/*"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  // When a file is missing from standalone/public, serve it from durable UPLOAD_ROOT via API.
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/uploads/:path*",
          destination: "/api/files/:path*",
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/og-default.jpg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.bing.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
