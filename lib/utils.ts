import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from "dompurify";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const STORAGE_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_STORAGE_DOMAINS || "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_URL ||
  "https://archivosminio.upea.bo/archivospaginasnode";

const SAFE_DOMAINS = [
  "archivosminio.upea.bo",
  "upea.bo",
  "upea.edu.bo",
  "facebook.com",
  "youtube.com",
  "youtu.be",
  "t.me",
];

const BLOCKED_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "filesystem:",
  "about:",
];

export const getStorageUrl = (
  file: string | null | undefined,

  type: "imagenes" | "documentos" = "imagenes",
): string => {
  if (!file) {
    return "";
  }

  const value = file.trim();

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const parsed = new URL(value);

      const host = parsed.hostname.toLowerCase();

      const valid =
        STORAGE_DOMAINS.length > 0
          ? STORAGE_DOMAINS.some(
              (domain) => host === domain || host.endsWith(`.${domain}`),
            )
          : SAFE_DOMAINS.some(
              (domain) => host === domain || host.endsWith(`.${domain}`),
            );

      if (!valid) {
        return "";
      }

      return parsed.href;
    }

    const cleanFile = value.replace(/^\/+/, "").replace(/\.\./g, "");

    return `${STORAGE_BASE}/${type}/${cleanFile}`;
  } catch {
    return "";
  }
};

export const sanitizeText = (
  text: string | null | undefined,

  maxLength = 500,
): string => {
  if (!text) {
    return "";
  }

  return text
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/file:/gi, "")
    .replace(/blob:/gi, "")
    .replace(/filesystem:/gi, "")
    .replace(/about:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>{}]/g, "")
    .slice(0, maxLength)
    .trim();
};

export const extractPlainText = (html: string | null | undefined): string => {
  if (!html) {
    return "";
  }

  const clean = sanitizeHTML(html);

  if (typeof window !== "undefined") {
    const temp = document.createElement("div");

    temp.innerHTML = clean;

    return (temp.textContent || temp.innerText || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return clean
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
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

export const sanitizeHTML = (html: string): string => {
  if (!html || typeof html !== "string") {
    return "";
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "a",
      "blockquote",
      "small",
    ],

    ALLOWED_ATTR: ["href", "target", "rel", "title"],

    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "svg",
      "math",
      "video",
      "audio",
      "canvas",
    ],

    FORBID_ATTR: [
      "style",
      "onclick",
      "onload",
      "onerror",
      "onmouseover",
      "onfocus",
      "onblur",
    ],

    ALLOW_DATA_ATTR: false,

    USE_PROFILES: {
      html: true,
    },
  });
};

export const isValidHexColor = (color: string | undefined): boolean => {
  if (!color) {
    return false;
  }

  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const getSafeColor = (
  color: string | undefined,

  fallback: string,
): string => {
  return isValidHexColor(color) ? color! : fallback;
};

export default {
  cn,
  getStorageUrl,
  sanitizeText,
  extractPlainText,
  isValidUrl,
  sanitizeHTML,
  isValidHexColor,
  getSafeColor,
};
