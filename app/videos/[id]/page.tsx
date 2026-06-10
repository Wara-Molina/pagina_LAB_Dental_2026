"use client";

import { useState, useEffect, Suspense } from "react";

import { useParams } from "next/navigation";

import { ArrowLeft, ExternalLink, Youtube, Info } from "lucide-react";

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

/*
|--------------------------------------------------------------------------
| YOUTUBE
|--------------------------------------------------------------------------
*/

const getYouTubeId = (url?: string): string | null => {
  if (!url) return null;

  try {
    /*
     * EMBED
     */

    if (url.includes("youtube.com/embed/")) {
      const match = url.match(/embed\/([a-zA-Z0-9_-]{11})/);

      return match?.[1] || null;
    }

    /*
     * WATCH
     */

    if (url.includes("youtube.com/watch")) {
      const parsed = new URL(url);

      return parsed.searchParams.get("v") || null;
    }

    /*
     * SHORT
     */

    if (url.includes("youtu.be/")) {
      const parsed = new URL(url);

      return parsed.pathname.replace("/", "");
    }

    return null;
  } catch {
    return null;
  }
};

const getEmbedUrl = (url?: string): string => {
  const id = getYouTubeId(url);

  if (!id) return "";

  return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1`;
};

/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

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

function VideoDetalleContent() {
  const params = useParams();

  const rawVideoId = Number(params.id);

  const videoId =
    Number.isInteger(rawVideoId) && rawVideoId > 0 ? rawVideoId : null;

  const [video, setVideo] = useState<Video | null>(null);

  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#04246C");

  const [secondaryColor, setSecondaryColor] = useState("#FC0102");

  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;

  /*
   * FETCH
   */

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [contenidoRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/contenido`),

          api.get(`/institucionesPrincipal/${institucionId}`),
        ]);

        if (!mounted) return;

        const encontrado = contenidoRes.data.upea_videos?.find(
          (v: any) =>
            Number(v.video_id) === videoId && Number(v.video_estado) === 1,
        );

        if (!encontrado) {
          setError("Video no encontrado");

          return;
        }

        setVideo(encontrado);

        setInstitucion(instRes.data.Descripcion || null);

        const colores = instRes.data?.Descripcion?.colorinstitucion?.[0];

        if (colores) {
          setPrimaryColor(getSafeColor(colores.color_primario, "#04246C"));

          setSecondaryColor(getSafeColor(colores.color_secundario, "#FC0102"));
        }
      } catch {
        if (mounted) {
          setError("Error cargando video");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [videoId, institucionId]);

  /*
   * LOADING
   */

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f5ef]">
        <Header />

        <div className="flex-1 flex items-center justify-center">
          <div
            className="
              w-14
              h-14
              border-4
              rounded-full
              animate-spin
            "
            style={{
              borderColor: `${hexToRgba(primaryColor, 0.2)}`,

              borderTopColor: primaryColor,
            }}
          />
        </div>

        <Footer />
      </div>
    );
  }

  /*
   * ERROR
   */

  if (error || !video) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f5ef]">
        <Header />

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <h2
              className="
                text-4xl
                font-bold
                mb-4
                text-gray-900
                font-serif
              "
            >
              {error}
            </h2>

            <Link
              href="/videos"
              className="
                inline-flex
                items-center
                gap-2
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
              <ArrowLeft className="w-5 h-5" />
              Volver
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  /*
   * YOUTUBE
   */

  const youtubeId = getYouTubeId(video.video_enlace);

  const embedUrl = getEmbedUrl(video.video_enlace);

  return (
    <div
      className="
        min-h-screen
        flex
        flex-col
        bg-[#f8f5ef]
      "
      style={{
        fontFamily: `
          "Times New Roman",
          serif
        `,
      }}
    >
      <Header />

      <main className="flex-1">
        <div
          className="
            max-w-7xl
            mx-auto
            px-4
            py-8
            lg:py-12
          "
        >
          <br />
          <br />
          <br />

          {/* TITULO ARRIBA */}

          <div className="mb-10">
            {video.video_tipo && (
              <span
                className="
                  inline-block
                  px-5
                  py-2
                  rounded-full
                  text-sm
                  font-semibold
                  mb-5
                "
                style={{
                  backgroundColor: `${hexToRgba(primaryColor, 0.12)}`,

                  color: primaryColor,
                }}
              >
                {video.video_tipo}
              </span>
            )}

            <h1
              className="
                text-4xl
                lg:text-6xl
                font-bold
                leading-tight
                tracking-tight
                text-gray-900
                font-serif
                mb-6
              "
            >
              {video.video_titulo}
            </h1>

            {video.video_breve_descripcion && (
              <div
                className="
                  text-gray-700
                  text-lg
                  leading-[1.9]
                  max-w-5xl
                "
                dangerouslySetInnerHTML={{
                  __html: sanitizeHTML(video.video_breve_descripcion),
                }}
              />
            )}
          </div>

          {/* VIDEO */}

          <div className="mb-12">
            <div
              className="
                bg-black
                rounded-[32px]
                overflow-hidden
                shadow-[0_20px_60px_rgba(0,0,0,0.15)]
                aspect-video
              "
            >
              {youtubeId ? (
                <iframe
                  src={embedUrl}
                  title={video.video_titulo}
                  allow="
                    accelerometer;
                    autoplay;
                    clipboard-write;
                    encrypted-media;
                    gyroscope;
                    picture-in-picture
                  "
                  allowFullScreen
                  className="
                    w-full
                    h-full
                  "
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div
                  className="
                    w-full
                    h-full
                    flex
                    items-center
                    justify-center
                    min-h-[400px]
                    bg-[#020617]
                  "
                >
                  <div className="text-center">
                    <div
                      className="
                        w-24
                        h-24
                        rounded-full
                        flex
                        items-center
                        justify-center
                        mx-auto
                        mb-6
                      "
                      style={{
                        backgroundColor: `${hexToRgba(secondaryColor, 0.15)}`,
                      }}
                    >
                      <Youtube
                        className="
                          w-14
                          h-14
                        "
                        style={{
                          color: secondaryColor,
                        }}
                      />
                    </div>

                    <p className="text-white text-xl">Video no disponible</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INFO */}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div
                className="
                  bg-white
                  rounded-[32px]
                  border
                  p-8
                  shadow-sm
                "
                style={{
                  borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                }}
              >
                <h2
                  className="
                    text-3xl
                    font-bold
                    mb-6
                    text-gray-900
                  "
                >
                  Detalles del video
                </h2>

                <div
                  className="
                    text-gray-700
                    leading-[1.9]
                    text-lg
                  "
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTML(video.video_breve_descripcion || ""),
                  }}
                />
              </div>
            </div>

            {/* SIDEBAR */}

            <div>
              <div
                className="
                  bg-white
                  rounded-[32px]
                  border
                  p-8
                  sticky
                  top-24
                  shadow-sm
                "
                style={{
                  borderColor: `${hexToRgba(primaryColor, 0.15)}`,
                }}
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                    mb-8
                  "
                >
                  <div
                    className="
                      w-12
                      h-12
                      rounded-2xl
                      flex
                      items-center
                      justify-center
                    "
                    style={{
                      backgroundColor: `${hexToRgba(primaryColor, 0.12)}`,
                    }}
                  >
                    <Info
                      className="
                        w-6
                        h-6
                      "
                      style={{
                        color: primaryColor,
                      }}
                    />
                  </div>

                  <h3
                    className="
                      text-2xl
                      font-bold
                      text-gray-900
                    "
                  >
                    Información
                  </h3>
                </div>

                <div className="space-y-8">
                  <div>
                    <p
                      className="
                        text-sm
                        uppercase
                        tracking-[0.15em]
                        mb-2
                      "
                      style={{
                        color: primaryColor,
                      }}
                    >
                      Institución
                    </p>

                    <p
                      className="
                        text-xl
                        font-semibold
                        text-gray-900
                      "
                    >
                      {institucion?.institucion_nombre || "UPEA"}
                    </p>
                  </div>

                  {video.video_tipo && (
                    <div>
                      <p
                        className="
                          text-sm
                          uppercase
                          tracking-[0.15em]
                          mb-2
                        "
                        style={{
                          color: primaryColor,
                        }}
                      >
                        Categoría
                      </p>

                      <p
                        className="
                          text-xl
                          font-semibold
                          text-gray-900
                        "
                      >
                        {video.video_tipo}
                      </p>
                    </div>
                  )}

                  {youtubeId && (
                    <a
                      href={`https://youtube.com/watch?v=${youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex
                        items-center
                        gap-3
                        px-8
                        py-4
                        rounded-2xl
                        text-white
                        font-semibold
                        transition-all
                        hover:scale-[1.02]
                      "
                      style={{
                        backgroundColor: "#FF0000",
                      }}
                    >
                      <Youtube className="w-6 h-6" />
                      Ver en YouTube
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
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

export default function VideoDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f5ef]">
          <div className="w-14 h-14 border-4 border-gray-300 border-t-[#04246C] rounded-full animate-spin" />
        </div>
      }
    >
      <VideoDetalleContent />
    </Suspense>
  );
}
