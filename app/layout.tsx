import type React from "react";
import type { Metadata, Viewport } from "next";

import { DM_Sans, Fraunces } from "next/font/google";

import { Analytics } from "@vercel/analytics/react";

import { InstitucionProvider } from "@/context/InstitucionContext";

import "./globals.css";

/*
|--------------------------------------------------------------------------
| FUENTES
|--------------------------------------------------------------------------
*/

const dmSans = DM_Sans({
  subsets: ["latin"],

  variable: "--font-dm-sans",

  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],

  variable: "--font-fraunces",

  display: "swap",
});

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const STATIC_LOGO = "/logo_upea.png";

const DEFAULT_INSTITUCION_ID = 12;

/*
|--------------------------------------------------------------------------
| VALIDACIONES
|--------------------------------------------------------------------------
*/

const SAFE_DOMAINS = [
  "upea.bo",
  "upea.edu.bo",
  "apiadministrador.upea.bo",
  "archivosminio.upea.bo",
];

const isValidUrl = (url?: string): boolean => {
  if (!url) return false;

  try {
    const parsed = new URL(url.trim());

    if (!["https:", "http:"].includes(parsed.protocol)) {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    return SAFE_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
};

const sanitizeField = (text?: string, maxLength = 160): string => {
  if (!text) return "";

  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`]/g, "")
    .trim()
    .slice(0, maxLength);
};

/*
|--------------------------------------------------------------------------
| INSTITUCIONES
|--------------------------------------------------------------------------
*/

const INSTITUCIONES: Record<
  number,
  {
    nombre: string;
    iniciales: string;
    mision: string;
    keywords: string[];
  }
> = {
  12: {
    nombre: "Ciencias de la Educación",

    iniciales: "UPEA",

    mision: "Formación de profesionales en educación de excelencia.",

    keywords: ["educación", "pedagogía", "UPEA", "Bolivia"],
  },

  22: {
    nombre: "Economía",

    iniciales: "UPEA",

    mision: "Formación de economistas con visión crítica y social.",

    keywords: ["economía", "finanzas", "UPEA", "Bolivia"],
  },

  32: {
    nombre: "Enfermería",

    iniciales: "UPEA",

    mision: "Formación de profesionales en enfermería altamente competentes.",

    keywords: ["enfermería", "salud", "UPEA", "Bolivia"],
  },
};

/*
|--------------------------------------------------------------------------
| GET DATA
|--------------------------------------------------------------------------
*/

const getInstitucionData = (id: number) => {
  return (
    INSTITUCIONES[id] || {
      nombre: "Institución",

      iniciales: "UPEA",

      mision: "Programas académicos de excelencia.",

      keywords: ["educación", "universidad", "UPEA"],
    }
  );
};

/*
|--------------------------------------------------------------------------
| VIEWPORT
|--------------------------------------------------------------------------
*/

export const viewport: Viewport = {
  width: "device-width",

  initialScale: 1,

  themeColor: "#04246C",

  colorScheme: "light dark",
};

/*
|--------------------------------------------------------------------------
| METADATA
|--------------------------------------------------------------------------
*/

export async function generateMetadata(): Promise<Metadata> {
  const institucionId =
    Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || DEFAULT_INSTITUCION_ID;

  const data = getInstitucionData(institucionId);

  const nombre = sanitizeField(data.nombre, 100);

  const iniciales = sanitizeField(data.iniciales, 20);

  const mision = sanitizeField(data.mision, 160);

  const keywords = data.keywords
    .map((keyword) => sanitizeField(keyword))
    .join(", ");

  /*
   * URL SEGURA
   */

  const fallbackUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://carreras.upea.bo";

  const appUrl = isValidUrl(process.env.NEXT_PUBLIC_URL)
    ? process.env.NEXT_PUBLIC_URL!
    : fallbackUrl;

  const metadataBase = new URL(appUrl);

  return {
    metadataBase,

    /*
     * TITLE
     */

    title: {
      default: `${nombre} - ${iniciales}`,

      template: `%s | ${nombre}`,
    },

    /*
     * BASICS
     */

    description: mision,

    keywords,

    authors: [
      {
        name: nombre,
      },
    ],

    creator: nombre,

    publisher: iniciales,

    alternates: {
      canonical: "/",
    },

    /*
     * ROBOTS
     */

    robots: {
      index: true,

      follow: true,

      googleBot: {
        index: true,

        follow: true,

        "max-image-preview": "large",

        "max-snippet": -1,
      },
    },

    /*
     * OPEN GRAPH
     */

    openGraph: {
      type: "website",

      locale: "es_BO",

      url: appUrl,

      siteName: `${nombre} - ${iniciales}`,

      title: `${nombre} - ${iniciales}`,

      description: mision,

      images: [
        {
          url: STATIC_LOGO,

          width: 1200,

          height: 630,

          alt: `Logo de ${nombre}`,
        },
      ],
    },

    /*
     * TWITTER
     */

    twitter: {
      card: "summary_large_image",

      title: `${nombre} - ${iniciales}`,

      description: mision,

      images: [STATIC_LOGO],
    },

    /*
     * ICONS
     */

    icons: {
      icon: [
        {
          url: "/icon-light-32x32.png",

          media: "(prefers-color-scheme: light)",
        },

        {
          url: "/icon-dark-32x32.png",

          media: "(prefers-color-scheme: dark)",
        },

        {
          url: "/icon.svg",

          type: "image/svg+xml",
        },
      ],

      apple: "/apple-icon.png",

      shortcut: STATIC_LOGO,
    },

    /*
     * GOOGLE VERIFY
     */

    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  };
}

/*
|--------------------------------------------------------------------------
| ROOT LAYOUT
|--------------------------------------------------------------------------
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const institucionId =
    Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || DEFAULT_INSTITUCION_ID;

  /*
   * STORAGE URL
   */

  const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL;

  const safeStorageUrl = isValidUrl(storageUrl);

  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${dmSans.variable} ${fraunces.variable}`}
    >
      <head>
        {safeStorageUrl && (
          <>
            <link rel="preconnect" href={storageUrl} crossOrigin="anonymous" />

            <link rel="dns-prefetch" href={storageUrl} />
          </>
        )}

        <link rel="icon" href={STATIC_LOGO} type="image/png" />
      </head>

      <body
        className="
          font-sans
          antialiased
          bg-background
          text-foreground
          overflow-x-hidden
        "
      >
        <InstitucionProvider institucionId={institucionId}>
          <div className="flex min-h-screen flex-col">
            {/* MAIN */}

            <main className="flex-1">{children}</main>
          </div>
        </InstitucionProvider>

        {/* ANALYTICS */}

        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
