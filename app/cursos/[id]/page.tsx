"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Users,
  Calendar,
  MapPin,
  BookOpen,
  CheckCircle,
  DollarSign,
  Share2,
  Maximize2,
  X,
  ZoomIn,
  Mail,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import api from "@/lib/axios";
import { getStorageUrl } from "@/lib/utils";
import { sanitizeHTML, sanitizeText, validateNumericId } from "@/lib/security";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { withRouter } from "next/router";

// ==================== TIPOS ====================
interface Curso {
  iddetalle_cursos_academicos: number;
  det_img_portada?: string;
  det_titulo: string;
  det_descripcion?: string;
  det_costo: number;
  det_costo_ext?: number;
  det_cupo_max: number;
  det_carga_horaria?: number;
  det_lugar_curso?: string;
  det_modalidad: string;
  det_fecha_ini?: string;
  det_fecha_fin?: string;
  det_hora_ini?: string;
  det_codigo?: string;
  det_version?: string;
  det_estado: string;
  tipo_curso_otro?: {
    tipo_conv_curso_nombre: string;
  };
}

interface InstitucionData {
  institucion_nombre?: string;
  institucion_correo1?: string;
  colorinstitucion: Array<{
    color_primario: string;
    color_secundario: string;
    color_terciario: string;
  }>;
}

// ==================== UTILIDADES ====================
const isValidHexColor = (color: string | undefined): boolean => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getSafeColor = (color: string | undefined, fallback: string): string => {
  return isValidHexColor(color) ? color! : fallback;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isValidImageUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const urlToParse = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(urlToParse);
    const validProtocol = ["https:"].includes(parsed.protocol);
    const safeDomain =
      parsed.hostname.includes("upea.bo") ||
      parsed.hostname.includes("localhost") ||
      parsed.hostname.includes("127.0.0.1");
    const safePath =
      !parsed.pathname.includes("<") &&
      !parsed.pathname.includes(">") &&
      !parsed.pathname.includes("javascript:");
    return validProtocol && safeDomain && safePath;
  } catch {
    return false;
  }
};

// ==================== COMPONENTE PRINCIPAL ====================
function CursoDetalleContent() {
  const params = useParams();
  const router = useRouter();

  const [curso, setCurso] = useState<Curso | null>(null);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const [primaryColor, setPrimaryColor] = useState("#04246C");
  const [secondaryColor, setSecondaryColor] = useState("#FC0102");
  const [tertiaryColor, setTertiaryColor] = useState("#020733");

  useEffect(() => {
    const fetchCurso = async () => {
      try {
        const safeId = validateNumericId(params.id);
        if (!safeId) {
          setError("ID de curso inválido");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        const institucionId = process.env.NEXT_PUBLIC_INSTITUCION_ID || 12;

        const [cursosRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/gacetaEventos`),
          api.get(`/institucionesPrincipal/${institucionId}`),
        ]);

        const cursoEncontrado = cursosRes.data.cursos?.find(
          (c: any) => c.iddetalle_cursos_academicos === safeId,
        );

        if (!cursoEncontrado) {
          setError("Curso no encontrado");
          return;
        }

        setCurso(cursoEncontrado);
        setInstitucion(instRes.data.Descripcion);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          const colors = instRes.data.Descripcion.colorinstitucion[0];
          setPrimaryColor(getSafeColor(colors.color_primario, "#04246C"));
          setSecondaryColor(getSafeColor(colors.color_secundario, "#FC0102"));
          setTertiaryColor(getSafeColor(colors.color_terciario, "#020733"));
        }
      } catch (err: any) {
        console.error("Error cargando curso:", err);
        setError(
          process.env.NODE_ENV === "production"
            ? "No se pudo cargar el curso"
            : "No se pudo cargar la información del curso",
        );
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCurso();
    }
  }, [params.id]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImageModalOpen(false);
    };

    if (imageModalOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [imageModalOpen]);

  const handleShare = async () => {
    if (!curso) return;
    const safeTitle = sanitizeText(curso.det_titulo, 100);
    const safeDescription = sanitizeText(
      curso.det_descripcion?.replace(/<[^>]*>/g, "") || "",
      200,
    );

    if (navigator.share) {
      try {
        await navigator.share({
          title: safeTitle,
          text: safeDescription,
          url: window.location.href,
        });
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.log("Error compartiendo:", err);
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("¡Enlace copiado al portapapeles!");
    }
  };

  const openImageModal = () => setImageModalOpen(true);
  const closeImageModal = () => setImageModalOpen(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Por definir";
    try {
      return new Date(dateString).toLocaleDateString("es-BO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Por definir";
    }
  };

  const getTipoColor = () => {
    const tipo = curso?.tipo_curso_otro?.tipo_conv_curso_nombre?.toUpperCase();
    const safePrimary = getSafeColor("white", "#ffffff");
    const safeSecondary = getSafeColor("white", "#f4f5f9");

    if (tipo === "CURSOS")
      return { bg: `${hexToRgba(safePrimary, 0.15)}`, text: safePrimary };
    if (tipo === "SEMINARIOS")
      return { bg: `${hexToRgba(safeSecondary, 0.15)}`, text: safeSecondary };
    return { bg: `${hexToRgba(safePrimary, 0.1)}`, text: safePrimary };
  };

  const imageUrl = useMemo(() => {
    if (!curso?.det_img_portada) return "";
    const url = getStorageUrl(curso.det_img_portada);
    return isValidImageUrl(url) ? url : "";
  }, [curso?.det_img_portada]);

  const institucionNombre =
    sanitizeText(institucion?.institucion_nombre || "", 100) || "UPEA";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})`,
          }}
        >
          <div className="text-center">
            <div
              className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
              style={{
                borderColor: `${hexToRgba(primaryColor, 0.3)}`,
                borderTopColor: primaryColor,
              }}
            />
            <p className="text-gray-600">Cargando curso...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !curso) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})`,
        }}
      >
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">📭</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">
              {error || "Curso no encontrado"}
            </h2>
            <p className="text-gray-600 mb-8">
              El curso que buscas no existe o ha sido eliminado
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <ArrowLeft className="w-5 h-5" /> Volver a cursos
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const tipoColors = getTipoColor();
  const tipoCurso = curso.tipo_curso_otro?.tipo_conv_curso_nombre || "CURSO";
  const tipoLabel = tipoCurso.charAt(0) + tipoCurso.slice(1).toLowerCase();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(180deg, #fff 0%, ${hexToRgba(primaryColor, 0.08)} 100%)`,
      }}
    >
      <Header />

      <main className="flex-1">
        {/* Hero Image */}
        {curso.det_img_portada && imageUrl ? (
          <div
            className="relative h-72 md:h-96 lg:h-[500px] group cursor-pointer"
            onClick={openImageModal}
          >
            <Image
              src={imageUrl}
              alt={sanitizeText(curso.det_titulo, 150)}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${hexToRgba(tertiaryColor, 0.6)} 0%, ${hexToRgba(primaryColor, 0.9)} 100%)`,
              }}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
              <div className="text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 shadow-2xl mb-3 inline-flex items-center gap-2">
                  <ZoomIn className="w-6 h-6" style={{ color: primaryColor }} />
                  <span className="text-gray-900 font-semibold text-sm">
                    Ver imagen completa
                  </span>
                </div>
                <p className="text-white/90 text-sm font-medium drop-shadow-lg">
                  Haz click para ampliar
                </p>
              </div>
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="max-w-6xl mx-auto">
                <span
                  className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-white/95 backdrop-blur-sm mb-4 shadow-lg"
                  style={{
                    backgroundColor: tipoColors.bg,
                    color: tipoColors.text,
                  }}
                >
                  {tipoLabel}
                </span>
                <div>
                  <br />
                  <br />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No image fallback */
          <div
            className="relative py-16"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.15)}, ${hexToRgba(secondaryColor, 0.1)})`,
            }}
          >
            <div className="max-w-6xl mx-auto px-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors"
                style={{ color: primaryColor }}
              >
                <div className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span>Volver</span>
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: `${hexToRgba(primaryColor, 0.15)}`,
                  }}
                >
                  <BookOpen
                    className="w-7 h-7"
                    style={{ color: primaryColor }}
                  />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-serif">
                  {sanitizeText(curso.det_titulo, 150)}
                </h1>
              </div>
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: tipoColors.bg,
                  color: tipoColors.text,
                }}
              >
                {tipoLabel}
              </span>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {imageModalOpen && curso.det_img_portada && imageUrl && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={closeImageModal}
            role="dialog"
            aria-modal="true"
            aria-label="Vista ampliada de imagen"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeImageModal();
              }}
              className="absolute top-6 right-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl"
              title="Cerrar (ESC)"
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeImageModal();
              }}
              className="absolute top-6 left-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div
              className="relative w-full h-full flex items-center justify-center p-4 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-md h-auto object-contain rounded-lg shadow-2xl mx-auto">
                <Image
                  src={imageUrl}
                  alt={sanitizeText(curso.det_titulo, 150)}
                  width={1920}
                  height={1080}
                  className="w-full h-full object-contain rounded-lg shadow-2xl"
                  unoptimized
                />
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
              <p className="text-white text-lg font-semibold bg-black/60 backdrop-blur-md inline-block px-6 py-3 rounded-full">
                {sanitizeText(curso.det_titulo, 100)}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-20">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div
                className="bg-white rounded-3xl shadow-xl border p-6 md:p-8"
                style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
              >
                {/* Info Cards Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div
                    className="p-5 rounded-2xl border text-center"
                    style={{
                      borderColor: `${hexToRgba(primaryColor, 0.2)}`,
                      background: `${hexToRgba(primaryColor, 0.05)}`,
                    }}
                  >
                    <div
                      className="p-2.5 rounded-xl mx-auto mb-3 w-fit"
                      style={{
                        backgroundColor: `${hexToRgba(primaryColor, 0.15)}`,
                      }}
                    >
                      <Clock
                        className="w-5 h-5"
                        style={{ color: primaryColor }}
                      />
                    </div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Duración
                    </p>
                    <p className="font-medium text-gray-900">
                      {curso.det_carga_horaria
                        ? `${curso.det_carga_horaria} horas`
                        : "Por definir"}
                    </p>
                  </div>

                  <div
                    className="p-5 rounded-2xl border text-center"
                    style={{
                      borderColor: `${hexToRgba(secondaryColor, 0.2)}`,
                      background: `${hexToRgba(secondaryColor, 0.05)}`,
                    }}
                  >
                    <div
                      className="p-2.5 rounded-xl mx-auto mb-3 w-fit"
                      style={{
                        backgroundColor: `${hexToRgba(secondaryColor, 0.15)}`,
                      }}
                    >
                      <Users
                        className="w-5 h-5"
                        style={{ color: secondaryColor }}
                      />
                    </div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: `${hexToRgba(secondaryColor, 0.7)}` }}
                    >
                      Cupos
                    </p>
                    <p className="font-medium text-gray-900">
                      {curso.det_cupo_max}
                    </p>
                  </div>

                  <div
                    className="p-5 rounded-2xl border text-center"
                    style={{
                      borderColor: `${hexToRgba(tertiaryColor, 0.2)}`,
                      background: `${hexToRgba(tertiaryColor, 0.05)}`,
                    }}
                  >
                    <div
                      className="p-2.5 rounded-xl mx-auto mb-3 w-fit"
                      style={{
                        backgroundColor: `${hexToRgba(tertiaryColor, 0.15)}`,
                      }}
                    >
                      <MapPin
                        className="w-5 h-5"
                        style={{ color: tertiaryColor }}
                      />
                    </div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: `${hexToRgba(tertiaryColor, 0.7)}` }}
                    >
                      Modalidad
                    </p>
                    <p className="font-medium text-gray-900">
                      {curso.det_modalidad === "VIRTUAL"
                        ? "💻 Virtual"
                        : curso.det_modalidad === "PRESENCIAL"
                          ? "🏫 Presencial"
                          : "🔄 Híbrido"}
                    </p>
                  </div>

                  <div
                    className="p-5 rounded-2xl border text-center"
                    style={{
                      borderColor: `${hexToRgba(primaryColor, 0.2)}`,
                      background: `${hexToRgba(primaryColor, 0.05)}`,
                    }}
                  >
                    <div
                      className="p-2.5 rounded-xl mx-auto mb-3 w-fit"
                      style={{
                        backgroundColor: `${hexToRgba(primaryColor, 0.15)}`,
                      }}
                    >
                      <Calendar
                        className="w-5 h-5"
                        style={{ color: primaryColor }}
                      />
                    </div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Inicio
                    </p>
                    <p className="font-medium text-gray-900">
                      {curso.det_fecha_ini
                        ? formatDate(curso.det_fecha_ini)
                        : "Por definir"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {curso.det_descripcion && (
                  <div className="mb-10">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">
                      Descripción del Curso
                    </h2>
                    <div
                      className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTML(curso.det_descripcion),
                      }}
                    />
                  </div>
                )}

                {/* Additional Details */}
                {(curso.det_lugar_curso ||
                  curso.det_hora_ini ||
                  curso.det_version) && (
                  <div
                    className="mb-10 p-6 rounded-2xl border"
                    style={{
                      borderColor: `${hexToRgba(primaryColor, 0.2)}`,
                      background: `${hexToRgba(primaryColor, 0.05)}`,
                    }}
                  >
                    <h3 className="font-semibold mb-4 text-gray-900">
                      Detalles adicionales
                    </h3>
                    <div className="space-y-3 text-sm">
                      {curso.det_lugar_curso && (
                        <div className="flex items-center gap-2">
                          <MapPin
                            className="w-4 h-4"
                            style={{ color: primaryColor }}
                          />
                          <span className="text-gray-700">
                            {sanitizeText(curso.det_lugar_curso, 100)}
                          </span>
                        </div>
                      )}
                      {curso.det_hora_ini && (
                        <div className="flex items-center gap-2">
                          <Clock
                            className="w-4 h-4"
                            style={{ color: primaryColor }}
                          />
                          <span className="text-gray-700">
                            Hora de inicio: {curso.det_hora_ini.substring(0, 5)}
                          </span>
                        </div>
                      )}
                      {curso.det_version && (
                        <div className="flex items-center gap-2">
                          <BookOpen
                            className="w-4 h-4"
                            style={{ color: primaryColor }}
                          />
                          <span className="text-gray-700">
                            Versión: {sanitizeText(curso.det_version, 50)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Price & Actions */}
                <div
                  className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t"
                  style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
                >
                  <div>
                    {curso.det_costo > 0 ? (
                      <>
                        <p className="text-sm text-gray-600 mb-1">Inversión</p>
                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-3xl font-bold"
                            style={{ color: primaryColor }}
                          >
                            Bs. {curso.det_costo}
                          </span>
                          {curso.det_costo_ext &&
                            curso.det_costo_ext !== curso.det_costo && (
                              <span className="text-sm text-gray-500">
                                (Ext. Bs. {curso.det_costo_ext})
                              </span>
                            )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <p className="text-xl font-bold text-green-600">
                          Gratuito
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 w-full sm:w-auto">
                    {institucion?.institucion_correo1 && (
                      <a
                        href={`mailto:${institucion.institucion_correo1}?subject=Consulta sobre: ${encodeURIComponent(curso.det_titulo)}`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:shadow-lg border-2"
                        style={{
                          borderColor: secondaryColor,
                          color: secondaryColor,
                        }}
                      >
                        <Mail className="w-4 h-4" /> Consultar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div
                className="bg-white rounded-3xl shadow-lg border p-6 lg:sticky lg:top-24"
                style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
              >
                <div
                  className="flex items-center gap-3 mb-6 pb-6 border-b"
                  style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
                >
                  <div
                    className="p-2.5 rounded-xl"
                    style={{
                      backgroundColor: `${hexToRgba(primaryColor, 0.15)}`,
                    }}
                  >
                    <BookOpen
                      className="w-6 h-6"
                      style={{ color: primaryColor }}
                    />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900">
                    Información
                  </h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Categoría
                    </p>
                    <p className="font-semibold text-gray-900">{tipoLabel}</p>
                  </div>

                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Institución
                    </p>
                    <p className="font-semibold text-gray-900">
                      {institucionNombre}
                    </p>
                  </div>

                  {curso.det_modalidad && (
                    <div>
                      <p
                        className="text-xs font-semibold uppercase tracking-wide mb-2"
                        style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                      >
                        Modalidad
                      </p>
                      <p className="font-medium text-gray-900">
                        {curso.det_modalidad === "VIRTUAL"
                          ? "💻 Virtual"
                          : curso.det_modalidad === "PRESENCIAL"
                            ? "🏫 Presencial"
                            : "🔄 Híbrido"}
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className="mt-8 pt-8 border-t"
                  style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
                >
                  <Link
                    href="/cursos"
                    className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 rounded-full font-medium transition-all hover:shadow-lg border-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Ver todos los cursos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ==================== WRAPPER CON SUSPENSE ====================
export default function CursoDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-12 h-12 border-4 border-gray-300 rounded-full animate-spin"
              style={{ borderTopColor: "#04246C" }}
            />
          </div>
          <Footer />
        </div>
      }
    >
      <CursoDetalleContent />
    </Suspense>
  );
}
