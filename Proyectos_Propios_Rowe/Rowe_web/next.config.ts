import type { NextConfig } from "next";

const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

function supabaseHost(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
}

const host = supabaseHost();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Sin dominio definitivo: nada se indexa (tampoco PDFs ni imágenes).
  ...(allowIndexing ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // react-pdf se ejecuta tal cual en Node (no se empaqueta)
  serverExternalPackages: ["@react-pdf/renderer", "imapflow", "mailparser"],
  // Fuentes y logo que leen del disco el PDF y los emails: se incluyen en el despliegue
  outputFileTracingIncludes: {
    "/api/quote/pdf": ["./src/assets/**/*"],
    "/api/leads": ["./src/assets/brand/**/*"],
    "/api/cron/email-retry": ["./src/assets/brand/**/*"],
    // Respuestas a mensajes e invitaciones desde el panel (acciones del servidor)
    "/admin/**": ["./src/assets/brand/**/*"],
  },
  reactStrictMode: true,
  // Desarrollo: abrir la web desde el móvil con la IP del ordenador en la red local
  // (http://192.168.x.x:3000). Sin esto, Next bloquea sus scripts y la página no arranca.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: host ? [{ protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" }] : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        // Tailwind solo procesa las hojas globales; los CSS Modules se compilan tal cual.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
