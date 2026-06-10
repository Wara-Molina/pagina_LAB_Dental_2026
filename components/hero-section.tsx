// components/hero-section.tsx
"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import Link from "next/link";
import api from "@/lib/axios";

import { Button } from "@/components/ui/button";
import { AnimatedText } from "@/components/animated-text";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Microscope,
} from "lucide-react";

import { getStorageUrl } from "@/lib/utils";
import { extractPlainText } from "@/lib/utils";

interface Portada {
  portada_id: number;
  portada_imagen: string;
  portada_titulo: string;
  portada_subtitulo: string;
}

interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface Institucion {
  institucion_nombre?: string | null;
  institucion_iniciales?: string | null;
  institucion_logo?: string;

  colorinstitucion?: ColorInstitucion[];
}

interface HeroData {
  portadas: Portada[];
  institucion: Institucion | null;
}

interface HeroProps {
  data: HeroData;
  currentSlide: number;
  currentPortada?: Portada;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  scale: number;
  borderRadius: number;
  sectionRef: React.RefObject<HTMLElement | null>;
}

const DEFAULT_PRIMARY = "#04246C";
const DEFAULT_SECONDARY = "#FC0102";
const DEFAULT_TERTIARY = "#020733";

const isValidHexColor = (color?: string): boolean => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getSafeColor = (color: string | undefined, fallback: string): string => {
  return isValidHexColor(color) ? color! : fallback;
};

const sanitizeImageUrl = (url?: string): string | null => {
  if (!url || typeof url !== "string") return null;

  try {
    if (url.startsWith("http")) {
      const parsed = new URL(url);

      const allowedHosts = [
        "apiadministrador.upea.bo",
        "archivosminio.upea.bo",
      ];

      if (!allowedHosts.includes(parsed.hostname)) {
        return null;
      }

      return parsed.toString();
    }

    return getStorageUrl(url);
  } catch {
    return null;
  }
};

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [data, setData] = useState<HeroData>({
    portadas: [],
    institucion: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =========================
  // ID DESDE ENV
  // =========================

  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID);

  // =========================
  // VALIDACIÓN SEGURA
  // =========================

  const safeInstitucionId =
    Number.isInteger(institucionId) && institucionId > 0 ? institucionId : 12;

  // =========================
  // FETCH
  // =========================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [contenidoRes, instRes] = await Promise.all([
          api.get(`/institucion/${safeInstitucionId}/contenido`),
          api.get(`/institucionesPrincipal/${safeInstitucionId}`),
        ]);

        setData({
          portadas: Array.isArray(contenidoRes?.data?.portada)
            ? contenidoRes.data.portada
            : [],
          institucion: instRes?.data?.Descripcion || null,
        });
      } catch {
        setError("No se pudo cargar la portada institucional.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [safeInstitucionId]);

  // =========================
  // SCROLL EFFECT
  // =========================

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const scrollY = window.scrollY;
      const sectionHeight = sectionRef.current.offsetHeight;

      const progress = Math.min(scrollY / (sectionHeight * 0.5), 1);

      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // =========================
  // AUTOPLAY
  // =========================

  useEffect(() => {
    if (data.portadas.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % data.portadas.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [data.portadas.length]);

  // =========================
  // SLIDER CONTROLS
  // =========================

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      setCurrentSlide(index);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    },
    [isTransitioning],
  );

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % data.portadas.length);
  }, [currentSlide, data.portadas.length, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + data.portadas.length) % data.portadas.length);
  }, [currentSlide, data.portadas.length, goToSlide]);

  // =========================
  // COLORS
  // =========================

  const colores = data.institucion?.colorinstitucion?.[0];

  const primaryColor = getSafeColor(colores?.color_primario, DEFAULT_PRIMARY);

  const secondaryColor = getSafeColor(
    colores?.color_secundario,
    DEFAULT_SECONDARY,
  );

  const tertiaryColor = getSafeColor(
    colores?.color_terciario,
    DEFAULT_TERTIARY,
  );

  // =========================
  // CURRENT SLIDE
  // =========================

  const currentPortada = data.portadas[currentSlide];

  const scale = 1 - scrollProgress * 0.05;
  const borderRadius = scrollProgress * 24;

  // =========================
  // STATES
  // =========================

  if (loading) {
    return (
      <section className="relative min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-slate-300 border-t-slate-800 animate-spin mx-auto mb-5" />
          <p className="text-slate-600">Cargando portada institucional...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="relative min-h-screen flex items-center justify-center bg-slate-100 px-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4"></div>

          <h2 className="text-2xl font-bold mb-4">Error de conexión</h2>

          <p className="text-slate-600 mb-6">{error}</p>

          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </section>
    );
  }

  // =========================
  // HERO DIFERENTE SOLO ID 34
  // =========================

  if (safeInstitucionId === 34) {
    return (
      <HeroLaboratorioDental
        data={data}
        currentSlide={currentSlide}
        currentPortada={currentPortada}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        tertiaryColor={tertiaryColor}
        nextSlide={nextSlide}
        prevSlide={prevSlide}
        goToSlide={goToSlide}
        scale={scale}
        borderRadius={borderRadius}
        sectionRef={sectionRef}
      />
    );
  }

  // =========================
  // HERO DEFAULT
  // =========================

  return (
    <HeroDefault
      data={data}
      currentSlide={currentSlide}
      currentPortada={currentPortada}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      tertiaryColor={tertiaryColor}
      nextSlide={nextSlide}
      prevSlide={prevSlide}
      goToSlide={goToSlide}
      scale={scale}
      borderRadius={borderRadius}
      sectionRef={sectionRef}
    />
  );
}

// ======================================================
// HERO ORIGINAL
// ======================================================

const HeroDefault = memo(function HeroDefault({
  data,
  currentSlide,
  currentPortada,
  primaryColor,
  nextSlide,
  prevSlide,
  goToSlide,
  scale,
  borderRadius,
  sectionRef,
}: HeroProps) {
  const institucionNombre = extractPlainText(
    data.institucion?.institucion_nombre || "",
  ).slice(0, 100);

  const institucionIniciales = extractPlainText(
    data.institucion?.institucion_iniciales || "",
  ).slice(0, 20);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden pt-20"
    >
      <div
        className="absolute inset-0 w-full h-full overflow-hidden transition-transform duration-100"
        style={{
          transform: `scale(${scale})`,
          borderRadius: `${borderRadius}px`,
        }}
      >
        {data.portadas.length > 0 ? (
          <div
            className="flex h-full transition-transform duration-700 ease-out"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {data.portadas.map((portada) => {
              const imageUrl = sanitizeImageUrl(portada.portada_imagen);

              return (
                <div
                  key={portada.portada_id}
                  className="w-full flex-shrink-0 relative"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: imageUrl ? `url('${imageUrl}')` : "none",
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}40, #00000050)`,
            }}
          />
        )}
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32 w-full">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-white font-medium mb-6">
            {institucionIniciales}
          </p>

          <h1
            className="
    font-serif
    text-7xl
    md:text-5xl
    lg:text-6xl
    xl:text-7xl
    font-medium
    leading-[1.05]
    tracking-tight
    text-background
    mb-8
    whitespace-normal
    break-words
    max-w-none
  "
          >
            {institucionNombre || "UPEA"}

            <br />
          </h1>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/cursos">
              <Button
                size="lg"
                className="rounded-full px-8 py-6"
                style={{
                  backgroundColor: primaryColor,
                }}
              >
                Explorar Cursos
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>

            <Link href="/comunicados">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 py-6 border-white/30 text-white bg-white/10 backdrop-blur-sm"
              >
                Ver Convocatorias
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {data.portadas.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {data.portadas.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="rounded-full transition-all duration-300 bg-white/40"
                style={{
                  width: currentSlide === index ? "32px" : "8px",
                  height: "4px",
                  backgroundColor:
                    currentSlide === index ? primaryColor : undefined,
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
});

// ======================================================
// HERO NUEVO SOLO PARA ID 34
// ======================================================

const HeroLaboratorioDental = memo(function HeroLaboratorioDental({
  data,
  currentSlide,
  currentPortada,
  primaryColor,
  secondaryColor,
  tertiaryColor,
  nextSlide,
  prevSlide,
  goToSlide,
  sectionRef,
}: HeroProps) {
  const institucionNombre =
    extractPlainText(data.institucion?.institucion_nombre || "").slice(
      0,
      100,
    ) || "LABORATORIO DENTAL";

  const imageUrl = sanitizeImageUrl(currentPortada?.portada_imagen);

  return (
    <section ref={sectionRef} className="relative min-h-screen overflow-hidden">
      {/* BACKGROUND */}
      <div className="absolute inset-0">
        {imageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
            style={{
              backgroundImage: `url('${imageUrl}')`,
            }}
          />
        )}

        <div />

        {/* EFECTOS */}
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
          style={{
            background: secondaryColor,
          }}
        />

        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-20"
          style={{
            background: primaryColor,
          }}
        />
      </div>

      {/* GRID */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 min-h-screen flex items-center py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center w-full">
          {/* LEFT */}
          <div>
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl text-white mb-8">
              <GraduationCap className="w-5 h-5" />

              <span className="text-sm tracking-wide">
                Formación Técnica Profesional
              </span>
            </div>

            <h1
              className="
    text-5xl
    md:text-6xl
    xl:text-7xl
    font-black
    leading-tight
    text-white
    tracking-tight
    drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]
  "
              style={{
                WebkitTextStroke: "1px rgba(0,0,0,0.25)",
                textShadow: `
      0 2px 10px rgba(0,0,0,0.35),
      0 4px 25px rgba(0,0,0,0.25)
    `,
              }}
            >
              <AnimatedText text={institucionNombre} delay={0.2} />
            </h1>

            <div
              className="w-28 h-1 rounded-full mt-8 mb-8"
              style={{
                background: secondaryColor,
              }}
            />

            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl">
              {currentPortada?.portada_subtitulo
                ? extractPlainText(currentPortada.portada_subtitulo).slice(
                    0,
                    220,
                  )
                : "Innovación académica, excelencia científica y formación profesional de alto nivel."}
            </p>
          </div>

          {/* RIGHT */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-[32px] p-10 shadow-2xl">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                      style={{
                        backgroundColor: primaryColor,
                      }}
                    >
                      <Microscope className="text-white w-7 h-7" />
                    </div>

                    <h3 className="text-4xl font-bold text-white mb-2">+10</h3>

                    <p className="text-white/70">Laboratorios especializados</p>
                  </div>

                  <div>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                      style={{
                        backgroundColor: secondaryColor,
                      }}
                    >
                      <BookOpen className="text-white w-7 h-7" />
                    </div>

                    <h3 className="text-4xl font-bold text-white mb-2">UPEA</h3>

                    <p className="text-white/70">Excelencia Académica</p>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/10">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-6">
                      <div className="min-w-0">
                        <p className="text-white/50 text-sm">
                          {institucionNombre}
                        </p>

                        <h4 className="text-white text-2xl font-bold mt-2 leading-tight break-words">
                          Formación Profesional
                        </h4>
                      </div>

                      <div className="w-30 h-30 rounded-2xl shrink-0 overflow-hidden border border-white/10 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        {(() => {
                          const logoUrl = sanitizeImageUrl(
                            data.institucion?.institucion_logo,
                          );

                          return logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={extractPlainText(
                                institucionNombre || "Institución",
                              )}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;

                                target.style.display = "none";
                              }}
                            />
                          ) : (
                            <GraduationCap className="w-7 h-7 text-white/70" />
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <Link href="/cursos" prefetch={false}>
                        <Button
                          size="lg"
                          className="w-full sm:w-auto rounded-2xl px-8 py-6 text-base font-semibold shadow-xl"
                          style={{
                            backgroundColor: secondaryColor,
                          }}
                        >
                          Explorar Cursos
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                      </Link>

                      <Link href="/comunicados" prefetch={false}>
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full sm:w-auto rounded-2xl px-8 py-6 text-base border-white/20 text-white bg-white/10 backdrop-blur-md hover:bg-white/20"
                        >
                          Ver Convocatorias
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      {data.portadas.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-3">
            {data.portadas.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: currentSlide === index ? "36px" : "10px",
                  height: "10px",
                  backgroundColor:
                    currentSlide === index
                      ? secondaryColor
                      : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
});
