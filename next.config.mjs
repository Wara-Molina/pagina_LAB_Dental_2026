/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",

  `script-src 'self' 'unsafe-inline' ${
    isDev ? "'unsafe-eval'" : ""
  } https://www.youtube.com https://www.youtube-nocookie.com`,

  "style-src 'self' 'unsafe-inline'",

  "img-src 'self' data: blob: https:",

  "font-src 'self' data:",

  "connect-src 'self' https://apiadministrador.upea.bo https://www.youtube.com https://www.youtube-nocookie.com https://archivosminio.upea.bo",

  "frame-src https://www.youtube.com https://www.youtube-nocookie.com   https://www.google.com https://maps.google.com https://archivosminio.upea.bo",

  "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",

  "frame-ancestors 'self'",

  "object-src 'none'",

  "base-uri 'self'",

  "form-action 'self'",

  "upgrade-insecure-requests",
]
  .join("; ")
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },

  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },

  {
    key: "Content-Security-Policy",
    value: csp,
  },
];

const nextConfig = {
  poweredByHeader: false,

  reactStrictMode: true,

  compress: true,

  generateEtags: false,

  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    unoptimized: true,

    remotePatterns: [
      {
        protocol: "https",
        hostname: "apiadministrador.upea.bo",
      },

      {
        protocol: "https",
        hostname: "archivosminio.upea.bo",
      },

      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },

      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;