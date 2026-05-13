// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DOMPurify from 'dompurify';

// ✅ Función cn para combinar clases de Tailwind (shadcn/ui style)
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ==================== CONFIGURACIÓN DE SEGURIDAD ====================

const STORAGE_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_STORAGE_DOMAINS || '')
  .split(',')
  .map(d => d.trim())
  .filter(Boolean);

const STORAGE_BASE = process.env.NEXT_PUBLIC_STORAGE_URL || 'https://archivosminio.upea.bo/archivospaginasnode';

// ✅ Construir URL para archivos de MinIO
export const getStorageUrl = (file: string | null | undefined, type: 'imagenes' | 'documentos' = 'imagenes'): string => {
  if (!file) return '';
  
  if (file.startsWith('http://') || file.startsWith('https://')) {
    return file;
  }
  
  const cleanFile = file.replace(/^\/+/, '');
  return `${STORAGE_BASE}/${type}/${cleanFile}`;
};

// ✅ Sanitizar texto para display seguro
export const sanitizeText = (text: string | null | undefined, maxLength = 500): string => {
  if (!text) return '';
  return text
    .replace(/[<>{}]/g, '')
    .replace(/javascript:/gi, '')
    .slice(0, maxLength)
    .trim();
};

// ✅ Extraer texto plano de HTML
export const extractPlainText = (html: string | null | undefined): string => {
  if (!html) return '';
  if (typeof window !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }
  return html.replace(/<[^>]*>/g, '').trim();
};

// ✅ Validar URL básica
export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ✅ Sanitizar HTML con DOMPurify
export const sanitizeHTML = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  });
};

// ✅ Validar color hex
export const isValidHexColor = (color: string | undefined): boolean => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

// ✅ Obtener color seguro con fallback
export const getSafeColor = (color: string | undefined, fallback: string): string => {
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