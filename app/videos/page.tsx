"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Play,
  Search,
  Filter,
  ArrowLeft,
  Loader2,
  Video,
  Youtube,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  X,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { sanitizeHTML } from "@/lib/sanitize";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface Video {
  video_id: number;
  video_titulo: string;
  video_breve_descripcion?: string;
  video_enlace?: string;
  video_estado: number;
  video_tipo?: string;
}

interface InstitucionData {
  institucion_nombre: string;
  colorinstitucion: Array<{
    color_primario: string;
    color_secundario: string;
    color_terciario: string;
  }>;
}

const isValidYouTubeEmbedUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname.includes("youtube.com") ||
        parsed.hostname.includes("youtu.be")) &&
      parsed.pathname.includes("/embed/")
    );
  } catch {
    return false;
  }
};

const getYouTubeId = (url?: string): string | null => {
  if (!url || !isValidYouTubeEmbedUrl(url)) return null;
  const match = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
};

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

const searchVideos = (videos: Video[], query: string): Video[] => {
  if (!query.trim()) return videos;
  const safeQuery = query
    .toLowerCase()
    .trim()
    .replace(/[<>{}]/g, "");
  return videos.filter((video) => {
    const titulo = video.video_titulo?.toLowerCase() || "";
    const descripcion = video.video_breve_descripcion?.toLowerCase() || "";
    const tipo = video.video_tipo?.toLowerCase() || "";
    return (
      titulo.includes(safeQuery) ||
      descripcion.includes(safeQuery) ||
      tipo.includes(safeQuery)
    );
  });
};

function VideosContent() {
  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
  const searchParams = useSearchParams();
  const router = useRouter();

  const paginaActual = Number(searchParams.get("pagina")) || 1;
  const itemsPorPagina = 6;

  const [videos, setVideos] = useState<Video[]>([]);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const [primaryColor, setPrimaryColor] = useState("#04246C");
  const [secondaryColor, setSecondaryColor] = useState("#FC0102");
  const [tertiaryColor, setTertiaryColor] = useState("#020733");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [videosRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/contenido`),
          api.get(`/institucionesPrincipal/${institucionId}`),
        ]);

        if (!isMounted) return;

        const videosData = (videosRes.data.upea_videos || [])
          .filter((v: any) => v.video_estado === 1)
          .map((v: any) => ({
            video_id: v.video_id,
            video_titulo: v.video_titulo || "Sin título",
            video_breve_descripcion: v.video_breve_descripcion || "",
            video_enlace: v.video_enlace,
            video_estado: v.video_estado,
            video_tipo: v.video_tipo || "General",
          })) as Video[];

        setVideos(videosData);
        setInstitucion(instRes.data.Descripcion || null);

        const tipos = Array.from(
          new Set(videosData.map((v) => v.video_tipo)),
        ).filter(Boolean);
        setTiposDisponibles(["TODOS", ...(tipos as string[])]);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          setPrimaryColor(
            getSafeColor(
              instRes.data.Descripcion.colorinstitucion[0].color_primario,
              "#04246C",
            ),
          );
          setSecondaryColor(
            getSafeColor(
              instRes.data.Descripcion.colorinstitucion[0].color_secundario,
              "#FC0102",
            ),
          );
          setTertiaryColor(
            getSafeColor(
              instRes.data.Descripcion.colorinstitucion[0].color_terciario,
              "#020733",
            ),
          );
        }
      } catch (err: any) {
        if (isMounted) {
          if (process.env.NODE_ENV === "development") {
            console.warn("Error cargando videos:", err);
          }
          setError("No se pudieron cargar los videos. Intente más tarde.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [institucionId]);

  const videosFiltrados = useMemo(() => {
    const porTipo =
      filtroTipo === "TODOS"
        ? videos
        : videos.filter((v) => v.video_tipo === filtroTipo);
    return searchVideos(porTipo, busqueda);
  }, [videos, filtroTipo, busqueda]);

  const totalPaginas = Math.ceil(videosFiltrados.length / itemsPorPagina);
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const videosPagina = videosFiltrados.slice(inicio, fin);

  const cambiarPagina = (nuevaPagina: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", nuevaPagina.toString());
    router.push(`/videos?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (paginaActual > 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pagina", "1");
      router.replace(`/videos?${params.toString()}`, { scroll: false });
    }
  }, [busqueda, filtroTipo]);

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
            <p className="text-gray-600">Cargando videos...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})`,
        }}
      >
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🎥</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">
              Error de conexión
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-shadow"
              style={{ backgroundColor: primaryColor }}
            >
              Reintentar
            </button>
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
        <section className="relative py-20 lg:py-28 overflow-hidden">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative max-w-6xl mx-auto px-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-8 transition-colors group"
            ></Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Videos Institucionales
              </h1>
            </div>

            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Conferences, clases grabadas y material audiovisual de{" "}
              <span className="font-semibold text-white">
                {institucion?.institucion_nombre || "nuestra institución"}
              </span>
            </p>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white font-medium">
                {videos.length} videos disponibles
              </span>
            </div>

            {/* Buscador Funcional */}
            <div className="relative max-w-xl">
              <div
                className={`relative flex items-center rounded-2xl transition-all ${searchFocused ? "ring-2 ring-white/50" : ""}`}
                style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
              >
                <Search
                  className="absolute left-4 w-5 h-5"
                  style={{ color: primaryColor }}
                />
                <input
                  type="text"
                  placeholder="Buscar por título, descripción o tipo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar videos"
                />
                {busqueda.length > 0 && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="absolute right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/80">
                  {videosFiltrados.length > 0
                    ? `${videosFiltrados.length} resultado${videosFiltrados.length !== 1 ? "s" : ""}`
                    : busqueda
                      ? "Sin resultados"
                      : `${videos.length} videos totales`}
                </span>
                {busqueda && (
                  <span className="text-white/60">
                    Buscando: "
                    <strong className="text-white">{busqueda}</strong>"
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section - Sticky */}
        <section
          className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b shadow-sm"
          style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
        >
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-5 h-5" style={{ color: primaryColor }} />
              {tiposDisponibles.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    filtroTipo === tipo
                      ? "text-white shadow-md scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={
                    filtroTipo === tipo ? { backgroundColor: primaryColor } : {}
                  }
                >
                  {tipo === "TODOS" ? "Todos" : tipo}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Videos Grid */}
        <section className="py-12 lg:py-16">
          <div className="max-w-6xl mx-auto px-4">
            {videosPagina.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <Video
                    className="w-10 h-10"
                    style={{ color: primaryColor }}
                  />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                  No se encontraron videos
                </h3>
                <p className="text-gray-600 mb-8">
                  Intenta con otros filtros o términos de búsqueda
                </p>
                <button
                  onClick={() => {
                    setBusqueda("");
                    setFiltroTipo("TODOS");
                  }}
                  className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
                  {videosPagina.map((video) => {
                    const youtubeId = getYouTubeId(video.video_enlace);

                    return (
                      <Link
                        key={video.video_id}
                        href={`/videos/${video.video_id}`}
                        className="group"
                      >
                        <div
                          className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                          style={{
                            borderColor: `${hexToRgba(primaryColor, 0.2)}`,
                          }}
                        >
                        
                          <div className="relative aspect-video overflow-hidden bg-gray-900">
                            {youtubeId ? (
                              <>
                                <img
                                  src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                                  alt={video.video_titulo}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                                    <Play
                                      className="w-7 h-7 ml-1"
                                      style={{ color: primaryColor }}
                                    />
                                  </div>
                                </div>
                                <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                                  <Youtube className="w-3.5 h-3.5" />
                                  YouTube
                                </div>
                              </>
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{
                                  background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.4)}, ${hexToRgba(secondaryColor, 0.3)})`,
                                }}
                              >
                                <Video className="w-16 h-16 text-white/60" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            {video.video_tipo && (
                              <span
                                className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3"
                                style={{
                                  backgroundColor: `${hexToRgba(primaryColor, 0.15)}`,
                                  color: primaryColor,
                                }}
                              >
                                {video.video_tipo}
                              </span>
                            )}

                            <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors text-gray-900">
                              {video.video_titulo}
                            </h3>

                            {video.video_breve_descripcion && (
                              <p
                                className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeHTML(
                                    video.video_breve_descripcion,
                                  ),
                                }}
                              />
                            )}

                            <div
                              className="flex items-center justify-between pt-4 border-t"
                              style={{
                                borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                              }}
                            >
                              <div
                                className="flex items-center gap-2 text-xs font-medium"
                                style={{
                                  color: `${hexToRgba(primaryColor, 0.8)}`,
                                }}
                              >
                                <Youtube
                                  className="w-4 h-4"
                                  style={{ color: "#FF0000" }}
                                />
                                <span>Ver video</span>
                              </div>
                              <ArrowLeft
                                className="w-4 h-4 transform rotate-180 group-hover:translate-x-1 transition-transform"
                                style={{ color: primaryColor }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => cambiarPagina(paginaActual - 1)}
                      disabled={paginaActual === 1}
                      className="p-3 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                      style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}` }}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft
                        className="w-5 h-5"
                        style={{ color: primaryColor }}
                      />
                    </button>

                    {Array.from(
                      { length: Math.min(totalPaginas, 5) },
                      (_, i) => {
                        let pageNum = i + 1;
                        if (totalPaginas > 5) {
                          if (paginaActual > 3) pageNum = paginaActual - 2 + i;
                          if (pageNum > totalPaginas)
                            pageNum = totalPaginas - 4 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => cambiarPagina(pageNum)}
                            className={`w-11 h-11 rounded-xl font-semibold transition-all ${
                              paginaActual === pageNum
                                ? "text-white shadow-lg scale-110"
                                : "border hover:bg-gray-50"
                            }`}
                            style={
                              paginaActual === pageNum
                                ? { backgroundColor: primaryColor }
                                : {
                                    borderColor: `${hexToRgba(primaryColor, 0.3)}`,
                                  }
                            }
                            aria-current={
                              paginaActual === pageNum ? "page" : undefined
                            }
                          >
                            {pageNum}
                          </button>
                        );
                      },
                    )}

                    <button
                      onClick={() => cambiarPagina(paginaActual + 1)}
                      disabled={paginaActual === totalPaginas}
                      className="p-3 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                      style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}` }}
                      aria-label="Página siguiente"
                    >
                      <ChevronRight
                        className="w-5 h-5"
                        style={{ color: primaryColor }}
                      />
                    </button>
                  </div>
                )}

                <p
                  className="text-center text-sm mt-6"
                  style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}
                >
                  Página {paginaActual} de {totalPaginas}
                </p>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function VideosPage() {
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
      <VideosContent />
    </Suspense>
  );
}
