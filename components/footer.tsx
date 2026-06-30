// components/Footer.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Youtube,
  Twitter,
  ExternalLink,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import DOMPurify from "dompurify";

// ✅ Importa tu cliente axios configurado (con interceptores, baseURL, etc.)
import api from "@/lib/axios";

// === INTERFACES (Tipado seguro) ===
interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface InstitucionData {
  institucion_id: number;
  institucion_nombre: string;
  institucion_iniciales: string;
  institucion_logo?: string;
  institucion_direccion?: string;
  institucion_correo1?: string;
  institucion_celular1?: number;
  institucion_celular2?: number;
  institucion_facebook?: string;
  institucion_youtube?: string;
  institucion_twitter?: string;
  institucion_mision?: string;
  colorinstitucion: ColorInstitucion[];
}

interface LinkExterno {
  id_link: number;
  nombre: string;
  url_link: string;
  estado: number;
  tipo: string;
}

interface FooterLink {
  label: string;
  href: string;
}

// === UTILIDADES DE SEGURIDAD Y UI ===

/**
 * Calcula si un color hex es claro para ajustar contraste de texto
 * Fórmula de luminancia relativa WCAG
 */
const isLightColor = (hex: string): boolean => {
  const color = hex.replace("#", "");
  if (color.length !== 6) return false;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

/**
 * Valida URLs de forma segura (previene javascript: y protocolos peligrosos)
 */
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitiza HTML para renderizado seguro (previene XSS)
 */
const sanitizeHtml = (html: string | undefined): string => {
  if (!html) return "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }); // Solo texto plano
};

// === COMPONENTE PRINCIPAL ===
export function Footer() {
  // 🔐 ID desde variable de entorno (nunca hardcodeado)
  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 32;

  // 📊 Estado reactivo
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [linksExternos, setLinksExternos] = useState<LinkExterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🎨 Colores dinámicos desde API
  const [primaryColor, setPrimaryColor] = useState("#04246C");
  const [secondaryColor, setSecondaryColor] = useState("#FC0102");
  const [tertiaryColor, setTertiaryColor] = useState("#020733");

  // 🔁 Efecto para cargar datos (con cleanup para evitar memory leaks)
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🚀 Peticiones en paralelo optimizadas
        const [instRes, recursosRes] = await Promise.all([
          api.get(`/institucionesPrincipal/${institucionId}`),
          api.get(`/institucion/${institucionId}/recursos`),
        ]);

        if (!isMounted) return;

        // ✅ Extraer y validar datos
        const instData = instRes.data?.Descripcion;
        if (instData) {
          setInstitucion(instData);

          // Filtrar links activos y limitar a 4 para el diseño
          const links = (recursosRes.data?.linksExternoInterno || [])
            .filter((l: any) => l?.estado === 1 && isValidUrl(l?.url_link))
            .slice(0, 4) as LinkExterno[];
          setLinksExternos(links);

          // 🎨 Aplicar colores desde API con fallback seguro
          if (instData.colorinstitucion?.[0]) {
            setPrimaryColor(
              instData.colorinstitucion[0].color_primario || "#04246C",
            );
            setSecondaryColor(
              instData.colorinstitucion[0].color_secundario || "#FC0102",
            );
            setTertiaryColor(
              instData.colorinstitucion[0].color_terciario || "#020733",
            );
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // 🔒 No exponer detalles de error en producción
          const msg =
            process.env.NODE_ENV === "development"
              ? err?.message || "Error cargando datos"
              : "No se pudo cargar la información";
          setError(msg);
          console.warn("Footer API Error:", err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    }; // ✅ Cleanup para evitar setState en componente desmontado
  }, [institucionId]);

  // 🎨 Calcular clases de texto según contraste del fondo
  const isLightBackground = isLightColor(tertiaryColor);
  const textColor = isLightBackground ? "text-gray-900" : "text-white";
  const textColorMuted = isLightBackground ? "text-gray-600" : "text-white/80";
  const textColorDimmed = isLightBackground ? "text-gray-500" : "text-white/60";
  const textColorFaint = isLightBackground ? "text-gray-400" : "text-white/40";
  const borderColor = isLightBackground ? "border-gray-200" : "border-white/10";
  const hoverText = isLightBackground
    ? "hover:text-gray-900"
    : "hover:text-white";
  const hoverBg = isLightBackground ? "hover:bg-gray-100" : "hover:bg-white/20";
  const iconBg = isLightBackground ? "bg-gray-100" : "bg-white/10";

  // 🔗 Links de navegación (adaptados a tu estructura UPEA)
  const navLinks: { label: string; href: string }[] = [
    { label: "Inicio", href: "/" },
    { label: "Cursos", href: "/cursos" },
    { label: "Eventos", href: "/eventos" },
    { label: "Comunicados", href: "/comunicados" },
    { label: "Gacetas", href: "/gacetas" },
    { label: "Investigación", href: "/institutoInvestigacion" },
  ];

  // 🌐 Redes sociales con validación de URL
  const socialLinks = [
    {
      name: "Facebook",
      url: institucion?.institucion_facebook,
      icon: Facebook,
      color: "#1877F2",
    },
    {
      name: "YouTube",
      url: institucion?.institucion_youtube,
      icon: Youtube,
      color: "#FF0000",
    },
    {
      name: "Telegram",
      url: institucion?.institucion_twitter,
      icon: Twitter,
      color: "#0088cc",
    },
  ].filter((link) => isValidUrl(link.url));

  // 🖼️ URL del logo con fallback
  const logoUrl = institucion?.institucion_logo;
  const institucionNombre = institucion?.institucion_nombre || "Carrera";
  const institucionIniciales = institucion?.institucion_iniciales || "UPEA";

  // === RENDERIZADO ===

  // 🔄 Estado de carga
  if (loading) {
    return (
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="animate-pulse grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-6 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 bg-gray-700 rounded w-1/2"></div>
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-700 rounded w-3/4"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  // ⚠️ Estado de error (sin exponer detalles sensibles)
  if (error) {
    return (
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          {error}
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="py-12 transition-colors duration-300"
      style={{ backgroundColor: tertiaryColor }}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* === GRID PRINCIPAL === */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
          {/* 🏷️ Brand Section (2 columnas en desktop) */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg} transition-colors`}
              >
                <BookOpen
                  className="w-5 h-5"
                  style={{ color: secondaryColor }}
                />
              </div>
              <div>
                <span
                  className={`font-serif text-lg font-medium ${textColor} group-hover:opacity-90 transition-opacity`}
                >
                  {institucionNombre}
                </span>
                <p className={`text-xs ${textColorDimmed}`}>
                  {institucionIniciales}
                </p>
              </div>
            </Link>

            {/* Misión sanitizada */}
            <p
              className={`${textColorMuted} leading-relaxed mb-6 max-w-sm text-sm`}
            >
              {institucion?.institucion_mision
                ? sanitizeHtml(institucion.institucion_mision)
                : "Formando profesionales competentes con excelencia académica y compromiso social."}
            </p>

            {/* Contacto */}
            <div className="space-y-3 text-sm">
              {institucion?.institucion_correo1 && (
                <a
                  href={`mailto:${institucion.institucion_correo1}`}
                  className={`flex items-center gap-3 ${textColorMuted} ${hoverText} transition-colors`}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {institucion.institucion_correo1}
                  </span>
                </a>
              )}
              {(institucion?.institucion_celular1 ||
                institucion?.institucion_celular2) && (
                <a
                  href={`tel:+591${institucion.institucion_celular1 || institucion.institucion_celular2}`}
                  className={`flex items-center gap-3 ${textColorMuted} ${hoverText} transition-colors`}
                >
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>
                    +591{" "}
                    {institucion.institucion_celular1 ||
                      institucion.institucion_celular2}
                  </span>
                </a>
              )}
              {institucion?.institucion_direccion && (
                <div className={`flex items-start gap-3 ${textColorMuted}`}>
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    {institucion.institucion_direccion}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 🔗 Navegación */}
          <div>
            <h4 className={`font-medium ${textColor} mb-4`}>Navegación</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm ${textColorMuted} ${hoverText} transition-colors block`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 🔗 Enlaces Externos (desde API) */}
          <div>
            <h4 className={`font-medium ${textColor} mb-4`}>Accesos</h4>
            <ul className="space-y-3">
              {linksExternos.length > 0 ? (
                linksExternos.map((link) => (
                  <li key={link.id_link}>
                    <a
                      href={link.url_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm ${textColorMuted} ${hoverText} transition-colors flex items-center gap-2`}
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{link.nombre}</span>
                    </a>
                  </li>
                ))
              ) : (
                <li className={`text-sm ${textColorDimmed}`}>
                  Sin enlaces disponibles
                </li>
              )}
            </ul>
          </div>

          {/* 🌐 Redes Sociales + Logo */}
          <div>
            <h4 className={`font-medium ${textColor} mb-4`}>Síguenos</h4>

            {/* Íconos sociales */}
            <div className="flex gap-3 mb-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-lg ${iconBg} ${hoverBg} transition-colors`}
                  title={`Visitar ${social.name}`}
                  aria-label={social.name}
                >
                  <social.icon
                    className="w-5 h-5"
                    style={{ color: social.color }}
                  />
                </a>
              ))}
              {socialLinks.length === 0 && (
                <span className={`text-xs ${textColorDimmed}`}>
                  Sin redes sociales
                </span>
              )}
            </div>

            {/* Logo institucional */}
            <div className={`pt-6 border-t ${borderColor}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`relative w-12 h-12 rounded-lg overflow-hidden ${isLightBackground ? "bg-gray-200" : "bg-white"} p-1`}
                >
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={`Logo de ${institucionNombre}`}
                      fill
                      className="object-contain"
                      sizes="48px"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.parentElement!.innerHTML = `
                          <div class="flex items-center justify-center w-full h-full">
                            <GraduationCap class="w-6 h-6 ${textColorDimmed}" />
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <GraduationCap
                      className={`w-6 h-6 ${textColorDimmed} m-3`}
                    />
                  )}
                </div>
                <div>
                  <p className={`text-xs font-medium ${textColor}`}>
                    {institucionNombre}
                  </p>
                  <p className={`text-xs ${textColorFaint}`}>
                    {institucionIniciales}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === BARRA INFERIOR === */}
        <div
          className={`border-t ${borderColor} pt-8 flex flex-col md:flex-row justify-between items-center gap-4`}
        >
         <p className="text-sm text-white text-center md:text-left">
            &copy; {new Date().getFullYear()} {institucionNombre}. Todos los
            derechos reservados.
          </p>

          <div className="flex gap-6 text-sm">
            <Link
              href="/privacidad"
             className="text-white hover:text-blue-300 transition-colors"
            >
              Política de privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-white hover:text-blue-300 transition-colors"
            >
              Términos de uso
            </Link>
            <a
              href="https://utic.upea.bo"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-white hover:text-blue-300 transition-colors flex items-center gap-1`}
            >
              UTIC UPEA <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
