// lib/security.ts
import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML para prevenir ataques XSS
 */
export const sanitizeHTML = (html: string): string => {
  if (typeof window === 'undefined') return html;
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style']
  });
};

/**
 * Valida que un ID sea numérico y seguro
 */
export const validateNumericId = (id: string | string[] | undefined): number | null => {
  if (!id || Array.isArray(id)) return null;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed >= Number.MAX_SAFE_INTEGER) return null;
  if (parsed.toString() !== id) return null;
  return parsed;
};

/**
 * Sanitiza texto plano para display, búsqueda o share
 */
export const sanitizeText = (text: string, maxLength = 500): string => {
  if (!text) return '';
  return text
    .replace(/[<>{}]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .slice(0, maxLength)
    .trim();
};

/**
 * Sanitiza parámetros de URL para queries
 */
export const sanitizeQueryParam = (param: string | null): string => {
  if (!param) return '';
  return param.replace(/[^a-zA-Z0-9\s\-_]/g, '').slice(0, 100);
};

/**
 * ✅ NUEVO: Valida y sanitiza URLs externas (solo https permitido)
 * @returns URL segura o null si es inválida/peligrosa
 */
export const sanitizeExternalUrl = (url: string | null | undefined, allowedDomains: string[] = []): string | null => {
  if (!url || typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  
  // Solo permitir protocolos seguros
  if (!trimmed.startsWith('https://')) {
    // Permitir http solo para localhost en desarrollo
    if (process.env.NODE_ENV === 'development' && trimmed.startsWith('http://localhost')) {
      return trimmed;
    }
    return null; // Bloquear javascript:, data:, file:, etc.
  }
  
  try {
    const parsed = new URL(trimmed);
    
    // Si hay dominios permitidos, validar contra ellos
    if (allowedDomains.length > 0) {
      const hostname = parsed.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) return null;
    }
    
    return parsed.href; // Retornar URL normalizada
  } catch {
    return null; // URL inválida
  }
};

/**
 * ✅ NUEVO: Valida URL de iframe de Google Maps
 */
export const validateGoogleMapsUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  
  // Solo HTTPS
  if (!trimmed.startsWith('https://')) return null;
  
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    
    // Solo permitir dominios oficiales de Google Maps
    const allowedHosts = [
      'www.google.com',
      'google.com',
      'maps.google.com',
      'maps.app.goo.gl',
      'www.google.com.bo',
      'google.com.bo'
    ];
    
    if (!allowedHosts.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      return null;
    }
    
    // Verificar que sea un embed válido (contiene /embedmap o /maps/embed)
    if (!parsed.pathname.includes('/embed') && !parsed.searchParams.has('q') && !parsed.searchParams.has('pb')) {
      // Permitir si tiene parámetros típicos de embed
      const hasEmbedParams = parsed.searchParams.has('output') || parsed.search.includes('pb=');
      if (!hasEmbedParams) return null;
    }
    
    return parsed.href;
  } catch {
    return null;
  }
};

/**
 * ✅ NUEVO: Sanitiza input de formulario en tiempo real
 */
export const sanitizeFormInput = (value: string, maxLength = 1000): string => {
  return value
    .replace(/<[^>]*>/g, '') // Eliminar etiquetas HTML
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '') // Eliminar event handlers
    .slice(0, maxLength)
    .trim();
};

/**
 * ✅ NUEVO: Simple rate limiter en memoria (para cliente)
 * Nota: El rate limiting REAL debe estar en el backend
 */
export class ClientRateLimiter {
  private static timestamps: Map<string, number[]> = new Map();
  
  static allow(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.timestamps.get(key) || [];
    
    // Remover timestamps fuera de la ventana
    const valid = timestamps.filter(ts => now - ts < windowMs);
    
    if (valid.length >= maxRequests) {
      this.timestamps.set(key, valid);
      return false;
    }
    
    valid.push(now);
    this.timestamps.set(key, valid);
    return true;
  }
  
  static reset(key: string): void {
    this.timestamps.delete(key);
  }
}