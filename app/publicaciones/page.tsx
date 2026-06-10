// app/publicaciones/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  User,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import api from "@/lib/axios";
import { getStorageUrl } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface Publicacion {
  publicaciones_id: number;
  publicaciones_titulo: string;
  publicaciones_imagen?: string;
  publicaciones_descripcion?: string;
  publicaciones_documento?: string;
  publicaciones_fecha: string;
  publicaciones_autor?: string;
  publicaciones_tipo?: string;
  publicaciones_estado?: string;
}

interface InstitucionData {
  institucion_nombre?: string;
  institucion_iniciales?: string;
  colorinstitucion: ColorInstitucion[];
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

const sanitizeSearchQuery = (query: string): string => {
  return query
    .replace(/[<>\"'&{}]/g, "")
    .trim()
    .slice(0, 200);
};

const searchPublicaciones = (
  publicaciones: Publicacion[],
  query: string,
): Publicacion[] => {
  if (!query.trim()) return publicaciones;
  const safeQuery = sanitizeSearchQuery(query).toLowerCase();
  return publicaciones.filter(
    (p) =>
      p.publicaciones_titulo.toLowerCase().includes(safeQuery) ||
      p.publicaciones_descripcion?.toLowerCase().includes(safeQuery) ||
      false ||
      p.publicaciones_autor?.toLowerCase().includes(safeQuery) ||
      false,
  );
};

function PublicacionesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawPagina = Number(searchParams.get("pagina"));
  const paginaActual =
    Number.isInteger(rawPagina) && rawPagina > 0 && rawPagina < 10000
      ? rawPagina
      : 1;
  const itemsPorPagina = 6;

  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string>("TODAS");
  const [searchFocused, setSearchFocused] = useState(false);

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<string[]>([]);

  const [primaryColor, setPrimaryColor] = useState("#04246C");
  const [secondaryColor, setSecondaryColor] = useState("#FC0102");
  const [tertiaryColor, setTertiaryColor] = useState("#020733");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const institucionId =
          Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;

        const [publiRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/recursos`),
          api.get(`/institucionesPrincipal/${institucionId}`),
        ]);

        const publicacionesData: Publicacion[] = (
          publiRes.data.upea_publicaciones || []
        ).filter(
          (p: any) =>
            p.publicaciones_estado !== "0" && p.publicaciones_tipo !== "SEDES",
        );

        setPublicaciones(publicacionesData);
        setInstitucion(instRes.data.Descripcion);

        const categoriasUnicas = Array.from(
          new Set(
            publicacionesData
              .map((p) => p.publicaciones_tipo)
              .filter(
                (tipo): tipo is string => Boolean(tipo) && tipo !== "SEDES",
              ),
          ),
        ).sort();

        setCategorias(["TODAS", ...categoriasUnicas]);

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
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Error cargando publicaciones:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const publicacionesFiltradas = useMemo(() => {
    let filtradas =
      categoriaActiva === "TODAS"
        ? publicaciones
        : publicaciones.filter((p) => p.publicaciones_tipo === categoriaActiva);
    return searchPublicaciones(filtradas, busqueda);
  }, [publicaciones, categoriaActiva, busqueda]);

  useEffect(() => {
    if (paginaActual > 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pagina", "1");
      router.replace(`/publicaciones?${params.toString()}`, { scroll: false });
    }
  }, [busqueda, categoriaActiva]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(publicacionesFiltradas.length / itemsPorPagina),
  );
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = Math.min(inicio + itemsPorPagina, publicacionesFiltradas.length);
  const publicacionesPagina = publicacionesFiltradas.slice(inicio, fin);

  const cambiarPagina = (nuevaPagina: number) => {
    const safePagina =
      Number.isInteger(nuevaPagina) && nuevaPagina > 0 && nuevaPagina < 10000
        ? nuevaPagina
        : 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", safePagina.toString());
    router.push(`/publicaciones?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Fecha no disponible";
    try {
      return new Date(dateString).toLocaleDateString("es-BO", {
        year: "numeric",
        month: "long",
        day: "numeric",
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
            <p className="text-gray-600">Cargando publicaciones...</p>
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
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative max-w-6xl mx-auto px-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-8 transition-colors group"
            >
              <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="font-medium">Volver al inicio</span>
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Publicaciones
              </h1>
            </div>

            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Artículos, investigaciones y documentos académicos de{" "}
              <span className="font-semibold text-white">
                {institucion?.institucion_nombre || "nuestra institución"}
              </span>
            </p>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white font-medium">
                {publicaciones.length} publicaciones disponibles
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
                  placeholder="Buscar por título, autor o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar publicaciones"
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
                  {publicacionesFiltradas.length > 0
                    ? `${publicacionesFiltradas.length} resultado${publicacionesFiltradas.length !== 1 ? "s" : ""}`
                    : busqueda
                      ? "Sin resultados"
                      : `${publicaciones.length} publicaciones totales`}
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
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaActiva(categoria)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    categoriaActiva === categoria
                      ? "text-white shadow-md scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={
                    categoriaActiva === categoria
                      ? { backgroundColor: primaryColor }
                      : {}
                  }
                >
                  {categoria === "TODAS" ? "Todas" : categoria}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Publications Grid */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {publicacionesPagina.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <BookOpen
                    className="w-10 h-10"
                    style={{ color: primaryColor }}
                  />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                  No se encontraron publicaciones
                </h3>
                <p className="text-gray-600 mb-8">
                  Intenta con otros filtros o términos de búsqueda
                </p>
                <button
                  onClick={() => {
                    setBusqueda("");
                    setCategoriaActiva("TODAS");
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
                  {publicacionesPagina.map((publicacion) => (
                    <Link
                      key={publicacion.publicaciones_id}
                      href={`/publicaciones/${publicacion.publicaciones_id}`}
                      className="group"
                    >
                      <div
                        className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col"
                        style={{
                          borderColor: `${hexToRgba(primaryColor, 0.2)}`,
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="relative h-48 overflow-hidden bg-gray-100">
                          {publicacion.publicaciones_imagen ? (
                            <>
                              <Image
                                src={getStorageUrl(
                                  publicacion.publicaciones_imagen,
                                )}
                                alt={publicacion.publicaciones_titulo}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${hexToRgba(primaryColor, 0.4)}, ${hexToRgba(secondaryColor, 0.3)})">
                                        <svg class="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                        </svg>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </>
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{
                                background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.3)}, ${hexToRgba(secondaryColor, 0.2)})`,
                              }}
                            >
                              <BookOpen className="w-16 h-16 text-white/60" />
                            </div>
                          )}

                          {publicacion.publicaciones_tipo && (
                            <div className="absolute top-3 left-3">
                              <span
                                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm shadow-lg"
                                style={{ color: primaryColor }}
                              >
                                {publicacion.publicaciones_tipo}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors text-gray-900">
                            {publicacion.publicaciones_titulo}
                          </h3>

                          {publicacion.publicaciones_descripcion && (
                            <p
                              className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed flex-1"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHTML(
                                  publicacion.publicaciones_descripcion,
                                ),
                              }}
                            />
                          )}

                          <div
                            className="space-y-2 pt-4 border-t"
                            style={{
                              borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                            }}
                          >
                            {publicacion.publicaciones_autor && (
                              <div className="flex items-center gap-2 text-xs">
                                <User
                                  className="w-4 h-4"
                                  style={{ color: primaryColor }}
                                />
                                <span className="text-gray-600 line-clamp-1">
                                  {publicacion.publicaciones_autor}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar
                                className="w-4 h-4"
                                style={{ color: primaryColor }}
                              />
                              <span className="text-gray-600">
                                {formatDate(publicacion.publicaciones_fecha)}
                              </span>
                            </div>
                          </div>

                          <div
                            className="mt-6 pt-4 border-t flex items-center justify-between"
                            style={{
                              borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                            }}
                          >
                            <span
                              className="text-sm font-semibold"
                              style={{ color: primaryColor }}
                            >
                              Ver publicación
                            </span>
                            <ArrowLeft
                              className="w-4 h-4 transform rotate-180 group-hover:translate-x-1 transition-transform"
                              style={{ color: primaryColor }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
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
                  Página {paginaActual} de {totalPaginas} - Mostrando{" "}
                  {publicacionesPagina.length} de{" "}
                  {publicacionesFiltradas.length} publicaciones
                </p>
              </>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section
          className="py-16"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})`,
          }}
        >
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2
              className="text-3xl font-bold mb-4 font-serif"
              style={{ color: primaryColor }}
            >
              ¿Buscas algo específico?
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Contáctanos y te ayudaremos a encontrar la publicación que
              necesitas
            </p>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: primaryColor }}
            >
              Contactar ahora
              <ArrowLeft className="w-5 h-5 transform rotate-180" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function PublicacionesPage() {
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
      <PublicacionesContent />
    </Suspense>
  );
}
