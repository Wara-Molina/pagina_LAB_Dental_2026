"use client";

import { useEffect, useRef, useState, useMemo } from "react";

import api from "@/lib/axios";

import { getStorageUrl, extractPlainText } from "@/lib/utils";

import { Phone, Facebook, ArrowRight, ShieldCheck } from "lucide-react";

interface AutoridadItem {
  id_autoridad: number;

  foto_autoridad?: string | null;

  nombre_autoridad?: string | null;

  cargo_autoridad?: string | null;

  facebook_autoridad?: string | null;

  celular_autoridad?: string | null;

  twiter_autoridad?: string | null;
}

interface Institucion {
  institucion_nombre?: string | null;

  institucion_iniciales?: string | null;

  colorinstitucion?: Array<{
    color_primario?: string | null;

    color_secundario?: string | null;

    color_terciario?: string | null;
  }>;
}

interface AutoridadesData {
  autoridades: AutoridadItem[];

  institucion: Institucion | null;
}

const DEFAULT_PRIMARY = "#04246C";

const DEFAULT_SECONDARY = "#7C2D12";

const isValidHexColor = (color?: string | null): boolean => {
  if (!color) return false;

  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getSafeColor = (
  color: string | undefined | null,
  fallback: string,
): string => {
  if (color && isValidHexColor(color)) {
    return color;
  }

  return fallback;
};

const sanitizeImageUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    if (url.startsWith("http")) {
      const parsed = new URL(url);

      const allowedHosts = [
        "apiadministrador.upea.bo",
        "archivosminio.upea.bo",
      ];

      const valid = allowedHosts.some(
        (host) =>
          parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
      );

      if (!valid) {
        return null;
      }

      return parsed.toString();
    }

    return getStorageUrl(url);
  } catch {
    return null;
  }
};

export function AutoridadesHome() {
  const sectionRef = useRef<HTMLElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<AutoridadesData>({
    autoridades: [],
    institucion: null,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        setError(null);

        const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID);

        const results = await Promise.allSettled([
          api.get(`/institucion/${institucionId}/contenido`),

          api.get(`/institucionesPrincipal/${institucionId}`),
        ]);

        const contenidoRes =
          results[0].status === "fulfilled" ? results[0].value : null;

        const instRes =
          results[1].status === "fulfilled" ? results[1].value : null;

        const autoridades = Array.isArray(contenidoRes?.data?.autoridad)
          ? contenidoRes.data.autoridad
          : [];

        setData({
          autoridades,

          institucion: instRes?.data?.Descripcion || null,
        });
      } catch {
        setError("No se pudieron cargar las autoridades.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);



  useEffect(() => {
    if (data.autoridades.length <= 3) return;
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) return;

    let animationId: number;

    let scrollPosition = 0;

    const scrollSpeed = 0.45;

    const animate = () => {
      scrollPosition += scrollSpeed;

      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }

      scrollContainer.scrollLeft = scrollPosition;

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [data.autoridades]);

  /*
   * COLORS
   */

  const colores = data.institucion?.colorinstitucion?.[0];

  const primaryColor = getSafeColor(colores?.color_primario, DEFAULT_PRIMARY);

  const secondaryColor = getSafeColor(
    colores?.color_secundario,
    DEFAULT_SECONDARY,
  );

  /*
   * TEXT
   */

  const institucionNombre =
    extractPlainText(data.institucion?.institucion_nombre || "") || "UPEA";

  /*
   * ITEMS
   */

const items = useMemo(() => {
  return data.autoridades;
}, [data.autoridades]);
const centerItems = items.length <= 3;

  /*
   * LOADING
   */

  if (loading) {
    return (
      <section
        className="
          relative
          py-24
          lg:py-32
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            inset-0
            bg-cover
            bg-center
          "
          style={{
            backgroundImage: "url('/imagenes/imagen_upea.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-[#000000cc]" />

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            px-6
            text-center
          "
        >
          <div
            className="
              w-14
              h-14
              border-4
              border-white/30
              rounded-full
              animate-spin
              mx-auto
              mb-6
            "
            style={{
              borderTopColor: primaryColor,
            }}
          />

          <p className="text-white text-lg">Cargando autoridades...</p>
        </div>
      </section>
    );
  }

  /*
   * ERROR
   */

  if (error) {
    return (
      <section
        className="
          relative
          py-24
          lg:py-32
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            inset-0
            bg-cover
            bg-center
          "
          style={{
            backgroundImage: "url('/imagenes/imagen_upea.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-[#000000cc]" />

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            px-6
            text-center
          "
        >
          <p className="text-white mb-6">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="
              px-8
              py-4
              rounded-2xl
              text-white
              font-semibold
            "
            style={{
              backgroundColor: primaryColor,
            }}
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  /*
   * EMPTY
   */

  if (data.autoridades.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="autoridades"
      className="
        relative
        py-24
        lg:py-32
        overflow-hidden
        font-serif
      "
      style={{
        fontFamily: `
          "Times New Roman",
          "Cormorant Garamond",
          serif
        `,
      }}
    >
      {/* FONDO */}

      <div
        className="
          absolute
          inset-0
          bg-cover
          bg-center
          bg-fixed
        "
        style={{
          backgroundImage: "url('/imagenes/imagen_upea.jpg')",
        }}
      />

      {/* OVERLAY */}

      <div className="absolute inset-0 bg-[#0f172ad9]" />

      {/* LIGHT */}

      <div
        className="
          absolute
          inset-0
          opacity-20
        "
        style={{
          background: `
            radial-gradient(
              circle at top left,
              ${primaryColor},
              transparent 35%
            )
          `,
        }}
      />

      <div
        className="
          relative
          z-10
          max-w-7xl
          mx-auto
          px-6
          lg:px-8
        "
      >
        {/* HEADER */}

        <div className="text-center mb-20">
          <div
            className="
              inline-flex
              items-center
              gap-3
              px-6
              py-3
              rounded-full
              bg-white/10
              backdrop-blur-xl
              border
              border-white/20
              text-white
              mb-8
            "
          >
            <ShieldCheck className="w-4 h-4" />
            Equipo Institucional
          </div>

          <h2
            className="
              text-5xl
              md:text-6xl
              xl:text-7xl
              font-bold
              leading-[1]
              tracking-tight
              text-white
              mb-8
            "
            style={{
              textShadow: "0 8px 30px rgba(0,0,0,0.45)",
            }}
          >
            Autoridades
          </h2>

          <div
            className="
              w-32
              h-1
              rounded-full
              mx-auto
              mb-8
            "
            style={{
              backgroundColor: secondaryColor,
            }}
          />

          <p
            className="
              max-w-3xl
              mx-auto
              text-white/85
              text-xl
              leading-relaxed
            "
          >
            Conoce a las principales autoridades de{" "}
            <span
              className="font-bold"
              style={{
                color: "white",
              }}
            >
              {institucionNombre}
            </span>
            .
          </p>
        </div>

        {/* SLIDER */}

<div
  ref={scrollRef}
  className={`
    flex
    gap-8
    py-8
    ${
      centerItems
        ? "justify-center overflow-hidden"
        : "justify-start overflow-x-auto lg:overflow-x-hidden"
    }
  `}
>
          {items.map((autoridad, index) => {
            const imageUrl = sanitizeImageUrl(autoridad?.foto_autoridad);

            const nombre = extractPlainText(
              autoridad?.nombre_autoridad || "Autoridad",
            ).slice(0, 80);

            const cargo = extractPlainText(
              autoridad?.cargo_autoridad || "Cargo institucional",
            ).slice(0, 100);

            return (
              <div
                key={`${autoridad?.id_autoridad}-${index}`}
                className="
    flex-shrink-0
    w-[270px]
    md:w-[285px]
    group
  "
              >
                <article
                  className="
      h-[610px]
      flex
      flex-col
      rounded-[32px]
      overflow-hidden
      bg-white/10
      backdrop-blur-2xl
      border
      border-white/20
      shadow-[0_25px_60px_rgba(0,0,0,0.35)]
      hover:-translate-y-2
      transition-all
      duration-500
    "
                >
                  {/* IMAGE */}

                  <div
                    className="
        relative
        h-60
        overflow-hidden
        flex-shrink-0
      "
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={nombre}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="
            w-full
            h-full
            object-cover
            group-hover:scale-105
            transition-transform
            duration-700
          "
                      />
                    ) : (
                      <div
                        className="
            w-full
            h-full
            flex
            items-center
            justify-center
          "
                        style={{
                          backgroundColor: primaryColor,
                        }}
                      >
                        <ShieldCheck
                          className="
              w-20
              h-20
              text-white
            "
                        />
                      </div>
                    )}

                    <div
                      className="
          absolute
          inset-0
          bg-gradient-to-t
          from-black/70
          via-black/10
          to-transparent
        "
                    />

                    <div
                      className="
          absolute
          top-4
          left-4
          px-4
          py-2
          rounded-full
          text-xs
          font-semibold
          tracking-wide
          backdrop-blur-xl
          border
          border-white/20
          text-white
        "
                      style={{
                        backgroundColor: `${primaryColor}dd`,
                      }}
                    >
                      AUTORIDAD
                    </div>
                  </div>

                  {/* CONTENT */}

                  <div
                    className="
        flex
        flex-col
        flex-1
        p-6
      "
                  >
                    {/* TITLE */}

                    <div className="min-h-[120px]">
                      <h3
                        className="
            text-[2rem]
            leading-tight
            font-bold
            text-white
            line-clamp-2
            mb-4
          "
                      >
                        {nombre}
                      </h3>

                      <p
                        className="
            text-white/75
            leading-relaxed
            text-[15px]
            line-clamp-3
          "
                      >
                        {cargo}
                      </p>
                    </div>

                    {/* CONTACT */}

                    <div className="space-y-4 mt-6">
                      {autoridad?.celular_autoridad && (
                        <div
                          className="
              flex
              items-center
              gap-3
              text-white/75
            "
                        >
                          <div
                            className="
                w-10
                h-10
                rounded-xl
                flex
                items-center
                justify-center
                bg-white/10
                flex-shrink-0
              "
                          >
                            <Phone
                              className="w-4 h-4"
                              style={{
                                color: secondaryColor,
                              }}
                            />
                          </div>

                          <span className="truncate">
                            {autoridad.celular_autoridad}
                          </span>
                        </div>
                      )}

                      {autoridad?.facebook_autoridad && (
                        <div
                          className="
              flex
              items-center
              gap-3
              text-white/75
            "
                        >
                          <div
                            className="
                w-10
                h-10
                rounded-xl
                flex
                items-center
                justify-center
                bg-white/10
                flex-shrink-0
              "
                          >
                            <Facebook
                              className="w-4 h-4"
                              style={{
                                color: primaryColor,
                              }}
                            />
                          </div>

                          <span className="truncate">Facebook</span>
                        </div>
                      )}
                    </div>

                    {/* FOOTER */}

                    <div
                      className="
          mt-auto
          pt-6
          border-t
          border-white/10
          flex
          items-center
          justify-between
        "
                    >
                      <span
                        className="
            text-sm
            text-white/60
          "
                      >
                        Equipo institucional
                      </span>

                      <div
                        className="
            w-12
            h-12
            rounded-2xl
            flex
            items-center
            justify-center
            bg-white/10
            group-hover:scale-110
            transition-transform
          "
                      >
                        <ArrowRight
                          className="
              w-5
              h-5
              text-white
            "
                        />
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
