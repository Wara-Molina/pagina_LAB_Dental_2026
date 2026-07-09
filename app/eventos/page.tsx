"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Clock,
  Loader2,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
} from "lucide-react";
import Link from "next/link";

import api from "@/lib/axios";
import { getStorageUrl } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import CalendarWidget from "@/components/CalendarWidget";

interface Evento {
  evento_id: number;
  evento_titulo: string;
  evento_imagen?: string;
  evento_descripcion?: string;
  evento_fecha: string;
  evento_hora?: string;
  evento_lugar?: string;
  tipo_evento: string;
}

interface InstitucionData {
  institucion_nombre?: string;
  institucion_iniciales?: string;
  colorinstitucion: Array<{
    color_primario: string;
    color_secundario: string;
    color_terciario: string;
  }>;
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

const sanitizeTextField = (
  text: string | undefined,
  maxLength = 500,
): string => {
  if (!text) return "";
  return sanitizeHTML(text)
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
};

const sanitizeSearchQuery = (query: string): string => {
  return query
    .replace(/[<>\"'&{}]/g, "")
    .trim()
    .slice(0, 200);
};

const searchEventos = (eventos: Evento[], query: string): Evento[] => {
  if (!query.trim()) return eventos;
  const safeQuery = sanitizeSearchQuery(query).toLowerCase();
  return eventos.filter(
    (e) =>
      e.evento_titulo.toLowerCase().includes(safeQuery) ||
      e.evento_descripcion?.toLowerCase().includes(safeQuery) ||
      false ||
      e.tipo_evento.toLowerCase().includes(safeQuery) ||
      e.evento_lugar?.toLowerCase().includes(safeQuery) ||
      false,
  );
};

function EventosContent() {
  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawPagina = Number(searchParams.get("pagina"));
  const paginaActual =
    Number.isInteger(rawPagina) && rawPagina > 0 && rawPagina < 10000
      ? rawPagina
      : 1;

  const itemsPorPagina = 5;

  const [busqueda, setBusqueda] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#04246C");
  const [secondaryColor, setSecondaryColor] = useState("#FC0102");
  const [tertiaryColor, setTertiaryColor] = useState("#020733");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [eventoRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/gacetaEventos`),
          api.get(`/institucionesPrincipal/${institucionId}`),
        ]);

        if (!isMounted) return;

        const eventosData = (eventoRes.data.upea_evento || [])
          .filter((e: any) => e.evento_id)
          .map((e: any) => ({
            evento_id: e.evento_id,
            evento_titulo: sanitizeTextField(e.evento_titulo, 200),
            evento_imagen: e.evento_imagen,
            evento_descripcion: sanitizeHTML(e.evento_descripcion || ""),
            evento_fecha: e.evento_fecha,
            evento_hora: e.evento_hora,
            evento_lugar: sanitizeTextField(e.evento_lugar, 150),
            tipo_evento: sanitizeTextField(e.tipo_evento, 50),
          })) as Evento[];

        setEventos(eventosData);
        setInstitucion(instRes.data.Descripcion || null);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          const colors = instRes.data.Descripcion.colorinstitucion[0];
          setPrimaryColor(getSafeColor(colors.color_primario, "#04246C"));
          setSecondaryColor(getSafeColor(colors.color_secundario, "#FC0102"));
          setTertiaryColor(getSafeColor(colors.color_terciario, "#020733"));
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(err);

          setEventos([]);
          setInstitucion(null);

          setError(null);
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

  const formatDateFull = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getTypeStyle = (type: string) => {
    const t = type?.toUpperCase() || "";
    const safePrimary = getSafeColor(primaryColor, "#04246C");
    const safeSecondary = getSafeColor(secondaryColor, "#FC0102");

    if (t.includes("TALLER") || t.includes("WORKSHOP"))
      return {
        backgroundColor: `${hexToRgba(safeSecondary, 0.15)}`,
        color: safeSecondary,
      };
    if (t.includes("SEMINARIO"))
      return {
        backgroundColor: `${hexToRgba("#f59e0b", 0.15)}`,
        color: "#f59e0b",
      };
    return {
      backgroundColor: `${hexToRgba(safePrimary, 0.15)}`,
      color: safePrimary,
    };
  };

  const eventosFiltrados = useMemo(() => {
    return searchEventos(eventos, busqueda);
  }, [eventos, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(eventosFiltrados.length / itemsPorPagina),
  );
  const safePaginaActual = Math.min(Math.max(1, paginaActual), totalPaginas);
  const inicio = (safePaginaActual - 1) * itemsPorPagina;
  const fin = Math.min(inicio + itemsPorPagina, eventosFiltrados.length);
  const eventosPagina = eventosFiltrados.slice(inicio, fin);

  const cambiarPagina = (nuevaPagina: number) => {
    const safePagina =
      Number.isInteger(nuevaPagina) &&
      nuevaPagina > 0 &&
      nuevaPagina <= totalPaginas
        ? nuevaPagina
        : 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", safePagina.toString());
    router.push(`/eventos?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (safePaginaActual > 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pagina", "1");
      router.replace(`/eventos?${params.toString()}`, { scroll: false });
    }
  }, [busqueda]);

  const eventosParaCalendario = useMemo(
    () =>
      eventos.map((evento) => ({
        evento_id: evento.evento_id,
        evento_titulo: evento.evento_titulo,
        evento_fecha: evento.evento_fecha,
        evento_hora: evento.evento_hora,
        evento_lugar: evento.evento_lugar,
        evento_estado: "1",
      })),
    [eventos],
  );

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
            <p className="text-gray-600">Cargando eventos...</p>
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
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Próximos Eventos
              </h1>
            </div>

            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Participa en conferencias, talleres y eventos de networking con la
              comunidad educativa de{" "}
              <span className="font-semibold text-white">
                {institucion?.institucion_nombre || "nuestra institución"}
              </span>
            </p>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white font-medium">
                {eventos.length} eventos disponibles
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
                  placeholder="Buscar por título, lugar o tipo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar eventos"
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
                  {eventosFiltrados.length > 0
                    ? `${eventosFiltrados.length} resultado${eventosFiltrados.length !== 1 ? "s" : ""}`
                    : busqueda
                      ? "Sin resultados"
                      : `${eventos.length} eventos totales`}
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

        {/* Events + Calendar Layout */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Events List */}
              <div className="lg:col-span-2">
                {eventosPagina.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                      <Calendar
                        className="w-10 h-10"
                        style={{ color: primaryColor }}
                      />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">
                      No se encontraron archivos
                    </h3>
                    <p className="text-gray-600 mb-8">
                      No existen eventos registrados en este momento.
                    </p>{" "}
                    {busqueda && (
                      <button
                        onClick={() => setBusqueda("")}
                        className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-10">
                      {eventosPagina.map((event) => (
                        <Link
                          key={event.evento_id}
                          href={`/eventos/${event.evento_id}`}
                          className="group block mb-4"
                        >
                          <div
                            className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                            style={{
                              borderColor: `${hexToRgba(primaryColor, 0.2)}`,
                            }}
                          >
                            <div className="p-6 flex flex-col md:flex-row md:items-start gap-6">
                              {/* Date Badge */}
                              <div className="flex-shrink-0">
                                <div
                                  className="rounded-xl p-4 text-center w-20 shadow-sm"
                                  style={{
                                    backgroundColor: `${hexToRgba(primaryColor, 0.15)}`,
                                  }}
                                >
                                  <div
                                    className="text-xs uppercase font-semibold"
                                    style={{
                                      color: `${hexToRgba(primaryColor, 0.8)}`,
                                    }}
                                  >
                                    {new Date(
                                      event.evento_fecha,
                                    ).toLocaleDateString("es-ES", {
                                      month: "short",
                                    })}
                                  </div>
                                  <div
                                    className="text-2xl font-bold"
                                    style={{ color: primaryColor }}
                                  >
                                    {new Date(event.evento_fecha).getDate()}
                                  </div>
                                  <div
                                    className="text-xs"
                                    style={{
                                      color: `${hexToRgba(primaryColor, 0.7)}`,
                                    }}
                                  >
                                    {new Date(event.evento_fecha).getFullYear()}
                                  </div>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                                    {event.evento_titulo}
                                  </h3>
                                  <span
                                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold w-fit"
                                    style={getTypeStyle(event.tipo_evento)}
                                  >
                                    {event.tipo_evento}
                                  </span>
                                </div>

                                {event.evento_descripcion && (
                                  <p
                                    className="text-gray-600 mb-4 line-clamp-2 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHTML(
                                        event.evento_descripcion,
                                      ),
                                    }}
                                  />
                                )}

                                <div
                                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t"
                                  style={{
                                    borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                                  }}
                                >
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock
                                      className="w-4 h-4"
                                      style={{ color: primaryColor }}
                                    />
                                    <span className="text-gray-600">
                                      {event.evento_hora
                                        ? event.evento_hora.substring(0, 5)
                                        : "Hora por confirmar"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin
                                      className="w-4 h-4"
                                      style={{ color: primaryColor }}
                                    />
                                    <span className="text-gray-600 truncate">
                                      {event.evento_lugar ||
                                        "Lugar por confirmar"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar
                                      className="w-4 h-4"
                                      style={{ color: primaryColor }}
                                    />
                                    <span className="text-gray-600">
                                      {formatDateFull(event.evento_fecha)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPaginas > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-12">
                        <button
                          onClick={() => cambiarPagina(safePaginaActual - 1)}
                          disabled={safePaginaActual === 1}
                          className="p-3 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                          style={{
                            borderColor: `${hexToRgba(primaryColor, 0.3)}`,
                          }}
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
                              if (safePaginaActual > 3)
                                pageNum = safePaginaActual - 2 + i;
                              if (pageNum > totalPaginas)
                                pageNum = totalPaginas - 4 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => cambiarPagina(pageNum)}
                                className={`w-11 h-11 rounded-xl font-semibold transition-all ${
                                  safePaginaActual === pageNum
                                    ? "text-white shadow-lg scale-110"
                                    : "border hover:bg-gray-50"
                                }`}
                                style={
                                  safePaginaActual === pageNum
                                    ? { backgroundColor: primaryColor }
                                    : {
                                        borderColor: `${hexToRgba(primaryColor, 0.3)}`,
                                      }
                                }
                                aria-current={
                                  safePaginaActual === pageNum
                                    ? "page"
                                    : undefined
                                }
                              >
                                {pageNum}
                              </button>
                            );
                          },
                        )}

                        <button
                          onClick={() => cambiarPagina(safePaginaActual + 1)}
                          disabled={safePaginaActual === totalPaginas}
                          className="p-3 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                          style={{
                            borderColor: `${hexToRgba(primaryColor, 0.3)}`,
                          }}
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
                      Página {safePaginaActual} de {totalPaginas} - Mostrando{" "}
                      {eventosPagina.length} de {eventosFiltrados.length}{" "}
                      eventos
                    </p>
                  </>
                )}
              </div>

              {/* Sidebar: Calendar + Quick List */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-8">
                  {/* Calendar Widget */}
                  <div
                    className="bg-white rounded-2xl border shadow-lg overflow-hidden"
                    style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
                  >
                    <div
                      className="p-5 border-b"
                      style={{
                        borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                        background: `linear-gradient(
      135deg,
      ${hexToRgba(primaryColor, 0.1)} 0%,
      rgba(255,255,255,0.9) 100%
    )`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                          style={{
                            background: `linear-gradient(
          135deg,
          ${primaryColor},
          ${hexToRgba(primaryColor, 0.75)}
        )`,
                          }}
                        >
                          <Calendar className="w-6 h-6 text-white" />
                        </div>

                        <div>
                          <h2 className="text-2xl font-extrabold text-slate-800 leading-none">
                            Calendario
                          </h2>

                          <p className="text-sm text-slate-500 mt-1">
                            Agenda institucional
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      className="p-4 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(77,84,106,0.95) 0%, rgba(66,72,92,0.95) 100%)",
                      }}
                    >
                      <CalendarWidget
                        colores={{
                          color_primario: primaryColor,
                          color_secundario: secondaryColor,
                        }}
                        eventos={eventosParaCalendario}
                      />
                    </div>
                  </div>

                  {/* Quick Events List */}
                  {eventos.length > 0 && (
                    <div
                      className="bg-white rounded-2xl border shadow-lg overflow-hidden"
                      style={{
                        borderColor: `${hexToRgba(secondaryColor, 0.2)}`,
                      }}
                    >
                      <div
                        className="p-4 border-b"
                        style={{
                          borderColor: `${hexToRgba(secondaryColor, 0.2)}`,
                          background: `${hexToRgba(secondaryColor, 0.05)}`,
                        }}
                      >
                        <h3 className="font-bold text-lg text-gray-900">
                          Próximos Eventos
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        {eventos.slice(0, 4).map((evento) => (
                          <Link
                            key={evento.evento_id}
                            href={`/eventos/${evento.evento_id}`}
                            className="block group"
                          >
                            <div
                              className="p-4 rounded-xl border hover:shadow-md transition-all hover:-translate-y-0.5"
                              style={{
                                borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                                background: `${hexToRgba(primaryColor, 0.03)}`,
                              }}
                            >
                              <h4 className="font-semibold text-sm mb-2 line-clamp-2 text-gray-900 group-hover:text-primary transition-colors">
                                {evento.evento_titulo}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Calendar
                                  className="w-3 h-3"
                                  style={{ color: primaryColor }}
                                />
                                <span>
                                  {new Date(
                                    evento.evento_fecha,
                                  ).toLocaleDateString("es-BO")}
                                </span>
                              </div>
                              {evento.evento_lugar && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                  <MapPin
                                    className="w-3 h-3"
                                    style={{ color: primaryColor }}
                                  />
                                  <span className="line-clamp-1">
                                    {evento.evento_lugar}
                                  </span>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function EventosPage() {
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
      <EventosContent />
    </Suspense>
  );
}
