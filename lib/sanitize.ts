import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
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
  "a",
  "blockquote",
  "code",
  "pre",
  "small",
  "sub",
  "sup",
];

const ALLOWED_ATTR = ["href", "target", "rel", "title"];

const SAFE_DOMAINS = [
  "facebook.com",
  "fb.com",
  "youtube.com",
  "youtu.be",
  "t.me",
  "telegram.me",
  "google.com",
  "google.com.bo",
  "upea.bo",
  "upea.edu.bo",
  "archivosminio.upea.bo",
];

const BLOCKED_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "filesystem:",
  "about:",
  "chrome:",
  "ws:",
  "wss:",
];

export function sanitizeHTML(html: string): string {
  try {
    if (!html) {
      return "";
    }

    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,

      FORBID_TAGS: [
        "script",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "button",
        "textarea",
        "svg",
        "math",
        "template",
        "style",
        "video",
        "audio",
        "canvas",
      ],

      FORBID_ATTR: [
        "style",
        "srcdoc",
        "srcset",
        "onerror",
        "onclick",
        "onload",
        "onmouseover",
        "onmouseenter",
        "onmouseleave",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "formaction",
      ],

      ALLOW_DATA_ATTR: false,

      USE_PROFILES: {
        html: true,
      },
    });

    return clean.replace(
      /<a([^>]*)target="_blank"([^>]*)>/gi,
      `<a$1 target="_blank"$2 rel="noopener noreferrer nofollow">`,
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("sanitizeHTML:", error);
    }

    return "";
  }
}

export function sanitizeText(
  text: string,
  maxLength = 500,
): string {
  if (!text) {
    return "";
  }

  try {
    return text
      .replace(/javascript:/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/data:/gi, "")
      .replace(/blob:/gi, "")
      .replace(/file:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, maxLength);
  } catch {
    return "";
  }
}

export function sanitizeURL(url: string): string {
  if (!url) {
    return "";
  }

  try {
    const clean = url.trim();

    const lower = clean.toLowerCase();

    if (BLOCKED_PROTOCOLS.some((protocol) => lower.startsWith(protocol))) {
      return "";
    }

    const parsed = new URL(clean);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }

    const host = parsed.hostname.toLowerCase();

    const allowed = SAFE_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );

    if (!allowed) {
      return "";
    }

    return parsed.href;
  } catch {
    return "";
  }
}

export function sanitizeGoogleMap(url: string): string {
  if (!url) {
    return "";
  }

  const safe = sanitizeURL(url);

  if (!safe) {
    return "";
  }

  try {
    const parsed = new URL(safe);

    const valid =
      parsed.hostname.includes("google") &&
      (parsed.pathname.includes("/embed") || parsed.searchParams.has("pb"));

    return valid ? parsed.href : "";
  } catch {
    return "";
  }
}


export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeGoogleMap,
};
