"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  ExternalLink,
  Loader2,
  Maximize2,
  X,
} from "lucide-react";
import Link from "next/link";

import api from "@/lib/axios";
import { getStorageUrl } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface GacetaDetalle {
  gaceta_id: number;
  gaceta_titulo: string;
  gaceta_fecha: string;
  gaceta_documento?: string;
  gaceta_tipo?: string;
}

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

const isValidDocumentUrl = (url: string | undefined): boolean => {
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

const sanitizeTextField = (
  text: string | undefined,
  maxLength = 300,
): string => {
  if (!text) return "";
  return sanitizeHTML(text)
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
};

function GacetaDetalleContent() {
  const params = useParams();
  const router = useRouter();

  const rawGacetaId = Number(params.id);
  const gacetaId =
    Number.isInteger(rawGacetaId) && rawGacetaId > 0 && rawGacetaId < 10000000
      ? rawGacetaId
      : null;

  if (gacetaId === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold mb-4 text-gray-900">ID inválido</p>
            <Link
              href="/gacetas"
              className="text-blue-600 hover:underline font-medium"
            >
              ← Volver
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const [gaceta, setGaceta] = useState<GacetaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const [primaryColor, setPrimaryColor] = useState("#04246C");
  const [secondaryColor, setSecondaryColor] = useState("#FC0102");
  const [tertiaryColor, setTertiaryColor] = useState("#020733");

  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;

  useEffect(() => {
    let isMounted = true;

    const fetchGaceta = async () => {
      try {
        setLoading(true);

        const [gacetaRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/gacetaEventos`),
          api.get(`/institucionesPrincipal/${institucionId}`),
        ]);

        if (!isMounted) return;

        const encontrada = gacetaRes.data.upea_gaceta_universitaria?.find(
          (g: any) => g.gaceta_id === gacetaId,
        );

        if (encontrada) {
          setGaceta({
            gaceta_id: encontrada.gaceta_id,
            gaceta_titulo: sanitizeTextField(encontrada.gaceta_titulo, 200),
            gaceta_fecha: encontrada.gaceta_fecha,
            gaceta_documento: encontrada.gaceta_documento,
            gaceta_tipo: sanitizeTextField(encontrada.gaceta_tipo, 50),
          });

          if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
            const colors = instRes.data.Descripcion.colorinstitucion[0];
            setPrimaryColor(getSafeColor(colors.color_primario, "#04246C"));
            setSecondaryColor(getSafeColor(colors.color_secundario, "#FC0102"));
            setTertiaryColor(getSafeColor(colors.color_terciario, "#020733"));
          }
        } else {
          setError("Gaceta no encontrada");
        }
      } catch (err) {
        if (isMounted) {
          if (process.env.NODE_ENV === "development") {
            console.warn("Error cargando gaceta:", err);
          }
          setError("Error al cargar el documento");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGaceta();
    return () => {
      isMounted = false;
    };
  }, [gacetaId, institucionId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPdfModalOpen(false);
    };

    if (pdfModalOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [pdfModalOpen]);

  const documentoUrl = useMemo(() => {
    if (!gaceta?.gaceta_documento) return "";
    const url = getStorageUrl(gaceta.gaceta_documento);
    return isValidDocumentUrl(url) ? url : "";
  }, [gaceta?.gaceta_documento]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Fecha no disponible";
    try {
      return new Date(dateString).toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Fecha no disponible";
    }
  };

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
            <p className="text-gray-600">Cargando documento...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !gaceta) {
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
            <div className="text-7xl mb-6">📄</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">
              {error || "Documento no encontrado"}
            </h2>
            <p className="text-gray-600 mb-8">
              La gaceta que buscas no existe o ha sido eliminada
            </p>
            <Link
              href="/gacetas"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              <ArrowLeft className="w-5 h-5" /> Volver a gacetas
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(180deg, #fff 0%, ${hexToRgba(primaryColor, 0.08)} 100%)`,
      }}
    >
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 lg:py-16 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.85)} 0%, ${hexToRgba(tertiaryColor, 0.85)} 100%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
          <br />
          <br />
          <br />
          <br />
          <br />
          <div className="relative max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <div>
                {gaceta.gaceta_tipo && (
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm mb-3"
                    style={{ color: primaryColor }}
                  >
                    {gaceta.gaceta_tipo}
                  </span>
                )}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-serif">
                  {gaceta.gaceta_titulo}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">
                  {formatDate(gaceta.gaceta_fecha)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PDF Viewer */}
        <section className="py-8 lg:py-12">
          <div className="max-w-6xl mx-auto px-4">
            {documentoUrl ? (
              <div
                className="bg-white rounded-2xl border shadow-xl overflow-hidden"
                style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
              >
                <div
                  className="p-4 border-b flex items-center justify-between"
                  style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      className="w-5 h-5"
                      style={{ color: primaryColor }}
                    />
                    <span className="font-medium text-gray-900">
                      Vista previa del documento
                    </span>
                  </div>
                  <button
                    onClick={() => setPdfModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100"
                    style={{ color: primaryColor }}
                  >
                    <Maximize2 className="w-4 h-4" /> Pantalla completa
                  </button>
                </div>
                <div className="aspect-[3/4] md:aspect-[16/9] lg:h-[70vh]">
                  <iframe
                    src={`${documentoUrl}#toolbar=1`}
                    className="w-full h-full border-0"
                    title={`Visor de ${gaceta.gaceta_titulo}`}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
            ) : (
              <div
                className="bg-white rounded-2xl border shadow-xl p-12 text-center"
                style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
              >
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <FileText
                    className="w-12 h-12"
                    style={{ color: primaryColor }}
                  />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">
                  Documento no disponible
                </h3>
                <p className="text-gray-600 mb-6">
                  Este registro no tiene un archivo PDF adjunto.
                </p>
                <Link
                  href="/gacetas"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ArrowLeft className="w-4 h-4" /> Ver todas las gacetas
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Document Info */}
        {documentoUrl && (
          <section className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <div
                className="bg-white rounded-2xl border shadow-lg p-6 md:p-8"
                style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
              >
                <h3 className="text-xl font-bold mb-6 text-gray-900">
                  Información del documento
                </h3>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Título
                    </p>
                    <p className="font-medium text-gray-900">
                      {gaceta.gaceta_titulo}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50">
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Tipo
                    </p>
                    <p className="font-medium text-gray-900">
                      {gaceta.gaceta_tipo || "General"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50">
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Fecha
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatDate(gaceta.gaceta_fecha)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50">
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                    >
                      Formato
                    </p>
                    <p className="font-medium text-gray-900">PDF</p>
                  </div>
                </div>

                <div
                  className="flex flex-wrap gap-3 mt-8 pt-6 border-t"
                  style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
                >
                  <a
                    href={documentoUrl}
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Download className="w-5 h-5" /> Descargar PDF
                  </a>
                  <a
                    href={documentoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:shadow-lg border-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <ExternalLink className="w-5 h-5" /> Abrir en nueva pestaña
                  </a>
                  <button
                    onClick={() => setPdfModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:shadow-lg border-2"
                    style={{
                      borderColor: secondaryColor,
                      color: secondaryColor,
                    }}
                  >
                    <Maximize2 className="w-5 h-5" /> Ver en pantalla completa
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PDF Modal */}
        {pdfModalOpen && documentoUrl && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setPdfModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Vista de documento PDF en pantalla completa"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPdfModalOpen(false);
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
                setPdfModalOpen(false);
              }}
              className="absolute top-6 left-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <a
              href={documentoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 right-6 z-[110] flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white font-medium text-sm shadow-xl"
            >
              <Download className="w-4 h-4" /> Descargar
            </a>
            <div
              className="relative w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full max-w-7xl max-h-[95vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
                <iframe
                  src={`${documentoUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-[90vh]"
                  title={gaceta.gaceta_titulo}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
              <p className="text-white text-lg font-semibold bg-black/60 backdrop-blur-md inline-block px-6 py-3 rounded-full">
                <FileText className="w-5 h-5 inline mr-2" />{" "}
                {gaceta.gaceta_titulo}
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function GacetaDetallePage() {
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
      <GacetaDetalleContent />
    </Suspense>
  );
}
