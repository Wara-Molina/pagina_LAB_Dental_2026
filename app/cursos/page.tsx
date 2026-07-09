"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  Users,
  BookOpen,
  Search,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import api from "@/lib/axios";
import { getStorageUrl } from "@/lib/utils";
import { sanitizeHTML, sanitizeText, sanitizeQueryParam } from "@/lib/security";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import CalendarWidget from "@/components/CalendarWidget";

// ==================== TIPOS ====================
interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface Curso {
  iddetalle_cursos_academicos: number;
  det_img_portada?: string;
  det_titulo: string;
  det_descripcion?: string;
  det_costo: number;
  det_cupo_max: number;
  det_carga_horaria?: number;
  det_modalidad: string;
  det_fecha_ini?: string;
  det_fecha_fin?: string;
  det_estado: string;
  tipo_curso_otro?: {
    tipo_conv_curso_nombre: string;
  };
}

interface Evento {
  evento_id: number;
  evento_titulo: string;
  evento_fecha: string;
  evento_hora?: string;
  evento_lugar?: string;
  evento_estado?: string;
}

interface InstitucionData {
  institucion_nombre?: string;
  institucion_iniciales?: string;
  colorinstitucion: ColorInstitucion[];
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

const searchCursos = (cursos: Curso[], query: string): Curso[] => {
  if (!query.trim()) return cursos;
  const safeQuery = sanitizeQueryParam(query).toLowerCase();
  return cursos.filter(
    (c) =>
      c.det_titulo.toLowerCase().includes(safeQuery) ||
      c.det_descripcion?.toLowerCase().includes(safeQuery) ||
      false,
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
function CursosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paginaActual = Number(searchParams.get("pagina")) || 1;
  const itemsPorPagina = 4;

  const [tipoActivo, setTipoActivo] = useState<string>(
    sanitizeQueryParam(searchParams.get("tipo")) || "TODOS",
  );
  const [busqueda, setBusqueda] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiposConCursos, setTiposConCursos] = useState<string[]>([]);

  const [primaryColor, setPrimaryColor] = useState("#04246C");
  const [secondaryColor, setSecondaryColor] = useState("#FC0102");
  const [tertiaryColor, setTertiaryColor] = useState("#020733");

  // ==================== FETCH DATOS ====================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const institucionId = process.env.NEXT_PUBLIC_INSTITUCION_ID || 12;

        const gacetaEventosRes = await api.get(
          `/institucion/${institucionId}/gacetaEventos`,
        );
        const cursosData: Curso[] =
          gacetaEventosRes.data.cursos?.filter(
            (c: any) => c.det_estado === "1",
          ) || [];
        const eventosData: Evento[] =
          gacetaEventosRes.data.upea_evento?.filter(
            (e: any) => e.evento_estado === "1",
          ) || [];

        setCursos(cursosData);
        setEventos(eventosData);

        const tiposUnicos = new Set<string>();
        cursosData.forEach((curso) => {
          const tipo =
            curso.tipo_curso_otro?.tipo_conv_curso_nombre?.toUpperCase();
          if (tipo) tiposUnicos.add(tipo);
        });
        setTiposConCursos(Array.from(tiposUnicos));

        const instRes = await api.get(
          `/institucionesPrincipal/${institucionId}`,
        );
        setInstitucion(instRes.data.Descripcion);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          const colors = instRes.data.Descripcion.colorinstitucion[0];
          setPrimaryColor(getSafeColor(colors.color_primario, "#04246C"));
          setSecondaryColor(getSafeColor(colors.color_secundario, "#FC0102"));
          setTertiaryColor(getSafeColor(colors.color_terciario, "#020733"));
        }
      } catch (err: any) {
        console.error("Error cargando cursos:", err);

        const status = err?.response?.status;

        if (status === 404) {
          setCursos([]);
          setEventos([]);
          setTiposConCursos([]);
          setError(null);
          return;
        }

        setError(
          process.env.NODE_ENV === "production"
            ? "No se pudieron cargar los cursos."
            : "No se pudieron cargar los cursos. Intenta más tarde.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ==================== FILTROS ====================
  useEffect(() => {
    const currentTipo = searchParams.get("tipo") || "TODOS";
    if (currentTipo !== tipoActivo) {
      const params = new URLSearchParams(searchParams);
      if (tipoActivo !== "TODOS") {
        params.set("tipo", sanitizeQueryParam(tipoActivo));
      } else {
        params.delete("tipo");
      }
      router.replace(`/cursos?${params.toString()}`, { scroll: false });
    }
  }, [tipoActivo, router, searchParams]);

  const cursosFiltrados = useMemo(() => {
    let filtrados = cursos;
    if (tipoActivo !== "TODOS") {
      filtrados = filtrados.filter(
        (c) =>
          c.tipo_curso_otro?.tipo_conv_curso_nombre?.toUpperCase() ===
          tipoActivo,
      );
    }
    return searchCursos(filtrados, busqueda);
  }, [cursos, tipoActivo, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(cursosFiltrados.length / itemsPorPagina),
  );
  const safePaginaActual =
    totalPaginas === 0 ? 1 : Math.min(Math.max(1, paginaActual), totalPaginas);
  const inicio = (safePaginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const cursosPagina =
    cursosFiltrados.length === 0 ? [] : cursosFiltrados.slice(inicio, fin);
  const sinCursos = cursos.length === 0;
  const sinResultados = cursos.length > 0 && cursosFiltrados.length === 0;
  const cambiarPagina = (nuevaPagina: number) => {
    const safePagina =
      Number.isInteger(nuevaPagina) &&
      nuevaPagina > 0 &&
      nuevaPagina <= totalPaginas
        ? nuevaPagina
        : 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", safePagina.toString());
    router.push(`/cursos?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (safePaginaActual > 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pagina", "1");
      router.replace(`/cursos?${params.toString()}`, { scroll: false });
    }
  }, [busqueda, tipoActivo]);

  const getColorClasses = (tipo: string) => {
    const tipoUpper = tipo.toUpperCase();
    const safePrimary = getSafeColor(primaryColor, "#04246C");
    const safeSecondary = getSafeColor(secondaryColor, "#FC0102");
    const safeTertiary = getSafeColor(tertiaryColor, "#020733");

    if (tipoUpper === "CURSOS" || tipoUpper === "PRESENCIAL") {
      return {
        bg: `${hexToRgba(safePrimary, 0.15)}`,
        border: `${hexToRgba(safePrimary, 0.3)}`,
        text: safePrimary,
      };
    }
    if (tipoUpper === "SEMINARIOS") {
      return {
        bg: `${hexToRgba(safeSecondary, 0.15)}`,
        border: `${hexToRgba(safeSecondary, 0.3)}`,
        text: safeSecondary,
      };
    }
    if (tipoUpper === "TALLERES") {
      return {
        bg: `${hexToRgba(safeTertiary, 0.15)}`,
        border: `${hexToRgba(safeTertiary, 0.3)}`,
        text: safeTertiary,
      };
    }
    return {
      bg: `${hexToRgba(safePrimary, 0.1)}`,
      border: `${hexToRgba(safePrimary, 0.2)}`,
      text: safePrimary,
    };
  };

  const institucionNombre =
    sanitizeText(institucion?.institucion_nombre || "", 100) || "UPEA";
  const institucionIniciales =
    sanitizeText(institucion?.institucion_iniciales || "", 20) || "";

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
            <p className="text-gray-600">Cargando cursos...</p>
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
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">⚠️</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">
              Error al cargar cursos
            </h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
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

          <div className="relative max-w-6xl mx-auto px-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-8 transition-colors group"
            >
              <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors"></div>
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Oferta Académica
              </h1>
            </div>

            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Explora nuestros cursos, seminarios y talleres de{" "}
              <span className="font-semibold text-white">
                {institucionNombre}
              </span>
            </p>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white font-medium">
                {cursos.length} cursos disponibles
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
                  placeholder="Buscar cursos por título o descripción..."
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(sanitizeText(e.target.value, 100))
                  }
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar cursos"
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
                  {cursosFiltrados.length > 0
                    ? `${cursosFiltrados.length} resultado${cursosFiltrados.length !== 1 ? "s" : ""}`
                    : busqueda
                      ? "Sin resultados"
                      : `${cursos.length} cursos totales`}
                </span>
                {busqueda && (
                  <span className="text-white/60">
                    Buscando: <strong className="text-white">{busqueda}</strong>
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
              <GraduationCap
                className="w-5 h-5"
                style={{ color: primaryColor }}
              />

              <button
                onClick={() => setTipoActivo("TODOS")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  tipoActivo === "TODOS"
                    ? "text-white shadow-md scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={
                  tipoActivo === "TODOS"
                    ? { backgroundColor: primaryColor }
                    : {}
                }
              >
                Todos
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                  {cursos.length}
                </span>
              </button>

              {tiposConCursos.map((tipo) => {
                const isActive = tipoActivo === tipo;
                const colors = getColorClasses(tipo);
                const count = cursos.filter(
                  (c) =>
                    c.tipo_curso_otro?.tipo_conv_curso_nombre?.toUpperCase() ===
                    tipo,
                ).length;
                const label =
                  tipo === "CURSOS"
                    ? "Cursos"
                    : tipo === "SEMINARIOS"
                      ? "Seminarios"
                      : tipo.charAt(0) + tipo.slice(1).toLowerCase();

                return (
                  <button
                    key={tipo}
                    onClick={() => setTipoActivo(tipo)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? "text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={isActive ? { backgroundColor: colors.text } : {}}
                  >
                    {label}
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Content: Grid + Calendar */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Columna Izquierda: Grid de Cursos */}
              <div className="lg:col-span-2">
                {sinCursos || sinResultados ? (
                  <div className="text-center py-24">
                    <div
                      className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: hexToRgba(primaryColor, 0.08),
                      }}
                    >
                      <BookOpen
                        className="w-12 h-12"
                        style={{ color: primaryColor }}
                      />
                    </div>

                    <h3 className="text-3xl font-bold text-gray-900 mb-3">
                      {sinCursos
                        ? "No hay cursos disponibles"
                        : "No se encontraron resultados"}
                    </h3>

                    <p className="text-gray-600 text-lg max-w-xl mx-auto mb-8">
                      {sinCursos
                        ? "Actualmente no existen cursos registrados."
                        : "Prueba con otros filtros o términos de búsqueda."}
                    </p>

                    {!sinCursos && (
                      <button
                        onClick={() => {
                          setTipoActivo("TODOS");
                          setBusqueda("");
                        }}
                        className="px-8 py-3 rounded-xl text-white font-semibold"
                        style={{
                          backgroundColor: primaryColor,
                        }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      {cursosPagina.map((curso) => {
                        const tipoSeguro =
                          curso.tipo_curso_otro?.tipo_conv_curso_nombre ||
                          "CURSOS";
                        const colors = getColorClasses(tipoSeguro);
                        const tipoCurso =
                          curso.tipo_curso_otro?.tipo_conv_curso_nombre ||
                          "CURSO";
                        const tipoLabel =
                          tipoCurso.charAt(0) +
                          tipoCurso.slice(1).toLowerCase();

                        return (
                          <Link
                            key={curso.iddetalle_cursos_academicos}
                            href={`/cursos/${curso.iddetalle_cursos_academicos}`}
                            className="group"
                          >
                            <div
                              className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col"
                              style={{ borderColor: colors.border }}
                            >
                              {/* Imagen o Icono */}
                              <div className="relative h-40 overflow-hidden bg-gray-100">
                                {curso.det_img_portada ? (
                                  <>
                                    <Image
                                      src={getStorageUrl(curso.det_img_portada)}
                                      alt={sanitizeText(curso.det_titulo, 100)}
                                      fill
                                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                                      loading="lazy"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${colors.bg}, ${hexToRgba(secondaryColor, 0.1)})">
                                              <svg class="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                              </svg>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  </>
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{
                                      background: `linear-gradient(135deg, ${colors.bg}, ${hexToRgba(secondaryColor, 0.1)})`,
                                    }}
                                  >
                                    <BookOpen className="w-16 h-16 text-white/60" />
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="p-6 flex-1 flex flex-col">
                                <span
                                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3"
                                  style={{
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                  }}
                                >
                                  {tipoLabel}
                                </span>

                                <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors text-gray-900">
                                  {sanitizeText(curso.det_titulo, 100)}
                                </h3>

                                {curso.det_descripcion && (
                                  <p
                                    className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed flex-1"
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHTML(
                                        curso.det_descripcion,
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
                                  <div className="flex items-center gap-2 text-xs">
                                    <Clock
                                      className="w-4 h-4"
                                      style={{ color: colors.text }}
                                    />
                                    <span className="text-gray-600">
                                      {curso.det_carga_horaria || "Por definir"}{" "}
                                      horas
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <Users
                                      className="w-4 h-4"
                                      style={{ color: colors.text }}
                                    />
                                    <span className="text-gray-600">
                                      {curso.det_cupo_max} cupos
                                    </span>
                                  </div>
                                  {curso.det_costo > 0 && (
                                    <div
                                      className="text-xs font-bold"
                                      style={{ color: colors.text }}
                                    >
                                      Bs. {curso.det_costo}
                                    </div>
                                  )}
                                </div>

                                <div
                                  className="mt-6 pt-4 border-t flex items-center justify-between"
                                  style={{
                                    borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                                  }}
                                >
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: colors.text }}
                                  >
                                    Ver detalles
                                  </span>
                                  <ArrowLeft
                                    className="w-4 h-4 transform rotate-180 group-hover:translate-x-1 transition-transform"
                                    style={{ color: colors.text }}
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
                      {cursosPagina.length} de {cursosFiltrados.length} cursos
                    </p>
                  </>
                )}
              </div>

              {/* Sidebar: Calendar + Quick List */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-8">
                  {/* Calendar Widget */}
                  <div
                    className="bg-black/60 rounded-2xl border shadow-lg overflow-hidden"
                    style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}
                  >
                    <div
                      className="p-4 border-b"
                      style={{
                        borderColor: `${hexToRgba(primaryColor, 0.2)}`,
                        background: `${hexToRgba(primaryColor, 0.05)}`,
                      }}
                    >
                      <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                        <CalendarIcon
                          className="w-5 h-5"
                          style={{ color: primaryColor }}
                        />
                        Calendario
                      </h2>
                    </div>
                    <div className="p-4">
                      <CalendarWidget
                        colores={{
                          color_primario: primaryColor,
                          color_secundario: secondaryColor,
                        }}
                        eventos={eventos}
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
                        {eventos.slice(0, 3).map((evento) => (
                          <div
                            key={evento.evento_id}
                            className="p-4 rounded-xl border hover:shadow-md transition-all hover:-translate-y-0.5"
                            style={{
                              borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                              background: `${hexToRgba(primaryColor, 0.03)}`,
                            }}
                          >
                            <h4 className="font-semibold text-sm mb-2 line-clamp-2 text-gray-900">
                              {sanitizeText(evento.evento_titulo, 80)}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <CalendarIcon
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
                                <Users
                                  className="w-3 h-3"
                                  style={{ color: primaryColor }}
                                />
                                <span className="line-clamp-1">
                                  {sanitizeText(evento.evento_lugar, 50)}
                                </span>
                              </div>
                            )}
                          </div>
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

export default function CursosPage() {
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
      <CursosContent />
    </Suspense>
  );
}
