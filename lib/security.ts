import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
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
  "h6",
  "span",
  "a",
];

const ALLOWED_ATTR = ["href", "target", "rel", "title"];

const FORBIDDEN_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "svg",
  "math",
  "video",
  "audio",
];

const FORBIDDEN_ATTR = [
  "style",
  "onclick",
  "onload",
  "onerror",
  "onmouseover",
  "onmouseenter",
  "onmouseleave",
  "onfocus",
  "onblur",
  "onkeyup",
  "onkeydown",
  "onchange",
];

const SAFE_EXTERNAL_DOMAINS = [
  "facebook.com",
  "fb.com",
  "youtube.com",
  "youtu.be",
  "t.me",
  "telegram.me",
  "upea.bo",
  "upea.edu.bo",
  "google.com",
  "google.com.bo",
  "googleusercontent.com",
];

export const sanitizeHTML = (html: string | null | undefined): string => {
  if (!html) {
    return "";
  }

  const cleaned = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/on[a-z]+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "");

  try {
    return DOMPurify.sanitize(cleaned, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS: FORBIDDEN_TAGS,
      FORBID_ATTR: FORBIDDEN_ATTR,
      ALLOW_DATA_ATTR: false,
      USE_PROFILES: {
        html: true,
      },
    });
  } catch {
    return "";
  }
};

export const sanitizeText = (text: string, maxLength = 500): string => {
  if (!text) {
    return "";
  }

  return text
    .replace(/[<>{}"'&|\\^`[\]]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/file:/gi, "")
    .replace(/on[a-z]+\s*=/gi, "")
    .trim()
    .slice(0, maxLength);
};

export const validateNumericId = (id: unknown): number | null => {
  const parsed = Number(id);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (parsed <= 0) {
    return null;
  }

  if (parsed > Number.MAX_SAFE_INTEGER) {
    return null;
  }

  return parsed;
};

export const sanitizeQueryParam = (
  param: string | null | undefined,
  maxLength = 200,
): string => {
  if (!param || typeof param !== "string") {
    return "";
  }

  return sanitizeText(param, maxLength);
};

export const sanitizeExternalUrl = (
  url: string | null | undefined,

  allowedDomains: string[] = SAFE_EXTERNAL_DOMAINS,
): string | null => {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());

    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== "https:" && protocol !== "http:") {
      return null;
    }

    if (process.env.NODE_ENV !== "development") {
      if (protocol !== "https:") {
        return null;
      }
    }

    const host = parsed.hostname.toLowerCase();

    const valid = allowedDomains.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );

    if (!valid) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
};

export const validateGoogleMapsUrl = (
  url: string | null | undefined,
): string | null => {
  const safe = sanitizeExternalUrl(url, [
    "google.com",
    "google.com.bo",
    "googleusercontent.com",
  ]);

  if (!safe) {
    return null;
  }

  try {
    const parsed = new URL(safe);

    const allowed =
      parsed.pathname.includes("/embed") ||
      parsed.searchParams.has("pb") ||
      parsed.searchParams.has("q");

    return allowed ? parsed.href : null;
  } catch {
    return null;
  }
};

export const sanitizeHref = (href: string | null | undefined): string => {
  if (!href) {
    return "";
  }

  const value = href.trim();

  const lower = value.toLowerCase();

  const blocked = [
    "javascript:",
    "vbscript:",
    "data:",
    "file:",
    "livescript:",
    "blob:",
  ];

  if (blocked.some((x) => lower.startsWith(x))) {
    return "";
  }

  const allowed = ["http://", "https://", "mailto:", "tel:", "/", "#"];

  const valid = allowed.some((x) => lower.startsWith(x));

  return valid ? value : "";
};

export const sanitizeFormInput = (value: string, maxLength = 255): string => {
  return sanitizeText(value, maxLength);
};

export const extractPlainText = (html: string): string => {
  if (!html) {
    return "";
  }

  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isValidUrl = (url: string | null | undefined): boolean => {
  return sanitizeExternalUrl(url) !== null;
};

export const sanitizeApiString = (
  value: string | null | undefined,
  maxLength = 1000,
): string => {
  if (!value) {
    return "";
  }

  return sanitizeText(value, maxLength);
};

export const sanitizePhone = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/[^0-9+]/g, "")
    .slice(0, 20);
};

export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) {
    return "";
  }

  const cleaned = email.trim().toLowerCase();

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(cleaned) ? cleaned : "";
};

class RateLimiter {
  private requests = new Map<
    string,
    {
      count: number;
      resetTime: number;
    }
  >();

  allow(
    key: string,
    maxRequests = 1,
    windowMs = 10000,
  ): boolean {
    const now = Date.now();

    const current = this.requests.get(key);

    if (!current || now > current.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });

      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;

    return true;
  }
}

export const ClientRateLimiter = new RateLimiter();