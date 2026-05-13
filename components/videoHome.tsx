// components/videoHome.tsx
"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"

import {
  ArrowRight,
  PlayCircle,
} from "lucide-react"

import Link from "next/link"

import api from "@/lib/axios"

import {
  extractPlainText,
  sanitizeHTML,
} from "@/lib/sanitize"

interface VideoItem {
  video_id: number
  video_enlace: string
  video_titulo: string
  video_breve_descripcion: string
  video_tipo: string
  video_estado: number
}

interface Institucion {
  institucion_nombre: string

  colorinstitucion: Array<{
    color_primario: string
    color_secundario: string
    color_terciario: string
  }>
}

interface VideoData {
  videos: VideoItem[]

  institucion: Institucion | null
}

const isValidHexColor = (
  color: string | undefined
): boolean => {
  if (!color) return false

  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(
    color
  )
}

const getSafeColor = (
  color: string | undefined,
  fallback: string
): string => {
  if (
    color &&
    isValidHexColor(color)
  ) {
    return color
  }

  return fallback
}

const convertToEmbedUrl = (
  url: string
): string | null => {
  if (!url) return null

  try {
    if (
      url.includes(
        "youtube.com/embed/"
      )
    ) {
      return url
    }

    const parsed = new URL(url)

    if (
      parsed.hostname.includes(
        "youtu.be"
      )
    ) {
      const videoId =
        parsed.pathname.replace(
          "/",
          ""
        )

      return `https://www.youtube.com/embed/${videoId}`
    }

    if (
      parsed.hostname.includes(
        "youtube.com"
      )
    ) {
      const videoId =
        parsed.searchParams.get(
          "v"
        )

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    return null
  } catch {
    return null
  }
}

const getYoutubeThumbnail = (
  url: string
): string => {
  try {
    const embedUrl =
      convertToEmbedUrl(url)

    if (!embedUrl) {
      return "/placeholder.svg"
    }

    const videoId =
      embedUrl
        .split("/embed/")[1]
        ?.split("?")[0]

    if (!videoId) {
      return "/placeholder.svg"
    }

    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  } catch {
    return "/placeholder.svg"
  }
}

export function VideoHome() {
  const sectionRef =
    useRef<HTMLElement>(null)

  const [data, setData] =
    useState<VideoData>({
      videos: [],
      institucion: null,
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [isPlaying, setIsPlaying] =
    useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const institucionId =
          Number(
            process.env
              .NEXT_PUBLIC_INSTITUCION_ID
          )

        const results =
          await Promise.allSettled([
            api.get(
              `/institucion/${institucionId}/contenido`
            ),

            api.get(
              `/institucionesPrincipal/${institucionId}`
            ),
          ])

        const contenidoRes =
          results[0].status ===
          "fulfilled"
            ? results[0].value
            : null

        const instRes =
          results[1].status ===
          "fulfilled"
            ? results[1].value
            : null

        const videosActivos = (
          contenidoRes?.data
            ?.upea_videos || []
        ).filter(
          (v: any) =>
            Number(v.video_estado) ===
            1
        )

        setData({
          videos: videosActivos,

          institucion:
            instRes?.data
              ?.Descripcion || null,
        })
      } catch (err: any) {
        console.error(
          "Error cargando video:",
          err
        )

        setError(
          "No se pudieron cargar los videos"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "animate-fade-up"
                )
              }
            }
          )
        },
        { threshold: 0.1 }
      )

    const elements =
      sectionRef.current?.querySelectorAll(
        ".reveal"
      )

    elements?.forEach((el) =>
      observer.observe(el)
    )

    return () =>
      observer.disconnect()
  }, [])

  const colores =
    data.institucion
      ?.colorinstitucion?.[0]

  const primaryColor =
    getSafeColor(
      colores?.color_primario,
      "#04246C"
    )

  const secondaryColor =
    getSafeColor(
      colores?.color_secundario,
      "#FC0102"
    )

  const primerVideo =
    data.videos[0]

  const safeVideoUrl =
    primerVideo?.video_enlace
      ? convertToEmbedUrl(
          primerVideo.video_enlace
        )
      : null

  const thumbnailUrl =
    getYoutubeThumbnail(
      primerVideo?.video_enlace ||
        ""
    )

  const institucionNombre =
    extractPlainText(
      data.institucion
        ?.institucion_nombre || ""
    ).slice(0, 100) || "UPEA"

  if (loading) {
    return (
      <section
        className="
          py-24
          lg:py-32
          px-6
          font-serif
        "
        style={{
          fontFamily: `
            "Times New Roman",
            serif
          `,
        }}
      >
        <div className="max-w-7xl mx-auto">

          <div
            className="
              relative
              rounded-[48px]
              overflow-hidden
              min-h-[500px]
              flex
              items-center
              justify-center
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
              }}
            />

            <div className="absolute inset-0 bg-[#000000cc]" />

            <div className="relative z-10 text-center">

              <div
                className="
                  w-12
                  h-12
                  border-4
                  border-white/30
                  rounded-full
                  animate-spin
                  mx-auto
                  mb-4
                "
                style={{
                  borderTopColor:
                    primaryColor,
                }}
              />

              <p className="text-white text-lg">
                Cargando video...
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="
          py-24
          lg:py-32
          px-6
          font-serif
        "
        style={{
          fontFamily: `
            "Times New Roman",
            serif
          `,
        }}
      >
        <div className="max-w-7xl mx-auto">

          <div
            className="
              relative
              rounded-[48px]
              overflow-hidden
              min-h-[500px]
              flex
              items-center
              justify-center
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
              }}
            />

            <div className="absolute inset-0 bg-[#000000cc]" />

            <div className="relative z-10 text-center">

              <p className="text-white mb-4">
                {error}
              </p>

              <Button
                onClick={() =>
                  window.location.reload()
                }
              >
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!primerVideo) {
    return null
  }

  return (
    <section
      ref={sectionRef}
      id="video"
      className="
        relative
        py-24
        lg:py-32
        px-6
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

      <div className="max-w-7xl mx-auto relative z-10">

        {/* TITULO */}

        <div className="text-center mb-16 reveal">

          <div
            className="
              inline-flex
              items-center
              gap-3
              px-6
              py-3
              rounded-full
              backdrop-blur-xl
              border
              shadow-lg
              mb-6
          text-slate-700
            border-slate-200
           text-slate-900
            "
          >
            <PlayCircle className="w-5 h-5" />

            Videos Destacados
          </div>

          <h2
            className="
              text-5xl
              md:text-6xl
              font-bold
              tracking-tight
              leading-tight
              mb-6
              text-slate-900
            "
            style={{
              textShadow:
                "0 4px 20px rgba(0,0,0,0.35)",
            }}
          >
            Contenido Multimedia
          </h2>

          <div
            className="
              w-32
              h-1.5
              rounded-full
              mx-auto
              mb-6
            "
            style={{
              backgroundColor:
                secondaryColor,
            }}
          />

          <p
            className="
              max-w-3xl
              mx-auto
              text-lg
              md:text-xl
              text-slate-700
              leading-relaxed
            "
          >
            Descubre videos
            institucionales,
            académicos y
            educativos de{" "}

            <span
              className="font-bold"
              style={{
                color: secondaryColor,
              }}
            >
              {institucionNombre}
            </span>
            .
          </p>
        </div>

        {/* CONTENEDOR */}

        <div
          className="
            relative
            rounded-[48px]
            overflow-hidden
            shadow-[0_30px_100px_rgba(0,0,0,0.45)]
            border
            border-white/10
            text-slate-700
            backdrop-blur-2xl
          "
        >

          <div
            className="
              grid
              lg:grid-cols-2
              gap-0
            "
          >

            {/* VIDEO */}

            <div
              className="
                relative
                aspect-video
                lg:aspect-auto
                min-h-[500px]
                overflow-hidden
              "
            >

              {!isPlaying ? (
                <>
                  <div
                    className="
                      absolute
                      inset-0
                      bg-cover
                      bg-center
                    "
                    style={{
                      backgroundImage:
                        `url('${thumbnailUrl}')`,
                    }}
                  />

                  <div
                    className="
                      absolute
                      inset-0
                    "
                    style={{
                      background: `
                        linear-gradient(
                          135deg,
                          rgba(0,0,0,0.82),
                          rgba(0,0,0,0.45),
                          ${primaryColor}55
                        )
                      `,
                    }}
                  />

                  <button
                    onClick={() =>
                      setIsPlaying(true)
                    }
                    className="
                      absolute
                      inset-0
                      flex
                      items-center
                      justify-center
                      group
                    "
                    aria-label="Reproducir video"
                  >
                    <div
                      className="
                        w-24
                        h-24
                        lg:w-28
                        lg:h-28
                        rounded-full
                        flex
                        items-center
                        justify-center
                        backdrop-blur-md
                        border-4
                        border-white/30
                        shadow-2xl
                        transition-all
                        group-hover:scale-110
                      "
                      style={{
                        backgroundColor:
                          `${primaryColor}DD`,
                      }}
                    >
                      <PlayCircle
                        className="
                          w-12
                          h-12
                          text-white
                          ml-1
                        "
                      />
                    </div>
                  </button>

                  <div
                    className="
                      absolute
                      bottom-8
                      left-8
                      right-8
                    "
                  >

                    <span
                      className="
                        inline-block
                        px-4
                        py-2
                        rounded-full
                        text-xs
                        font-semibold
                        tracking-[0.15em]
                        backdrop-blur-md
                        mb-4
                        text-white
                      "
                      style={{
                        backgroundColor:
                          `${primaryColor}DD`,
                      }}
                    >
                      {primerVideo.video_tipo ||
                        "VIDEO"}
                    </span>

                    <h3
                      className="
                        text-white
                        text-2xl
                        lg:text-4xl
                        font-bold
                        tracking-tight
                        leading-tight
                      "
                    >
                      {extractPlainText(
                        primerVideo.video_titulo
                      ).slice(0, 90)}
                    </h3>
                  </div>
                </>
              ) : (
                <div
                  className="
                    absolute
                    inset-0
                    bg-black
                  "
                >
                  <iframe
                    key={safeVideoUrl}
                    src={`${
                      safeVideoUrl ||
                      primerVideo.video_enlace
                    }${
                      (
                        safeVideoUrl ||
                        primerVideo.video_enlace
                      ).includes("?")
                        ? "&autoplay=1"
                        : "?autoplay=1"
                    }`}
                    title={
                      primerVideo.video_titulo
                    }
                    className="w-full h-full"
                    loading="lazy"
                    allow="
                      accelerometer;
                      autoplay;
                      clipboard-write;
                      encrypted-media;
                      gyroscope;
                      picture-in-picture
                    "
                    allowFullScreen
                  />
                </div>
              )}
            </div>

            {/* TEXTO */}

            <div
              className="
                p-8
                lg:p-12
                xl:p-16
                flex
                flex-col
                justify-center
                relative
                overflow-hidden
                font-serif
                bg-[#f8f5ef]
              "
            >

              <div
                className="
                  absolute
                  top-0
                  right-0
                  w-72
                  h-72
                  rounded-full
                  blur-3xl
                  opacity-10
                "
                style={{
                  backgroundColor:
                    secondaryColor,
                }}
              />

              <div
                className="
                  absolute
                  bottom-0
                  left-0
                  w-72
                  h-72
                  rounded-full
                  blur-3xl
                  opacity-10
                "
                style={{
                  backgroundColor:
                    primaryColor,
                }}
              />

              <div className="relative z-10">

                <p
                  className="
                    text-sm
                    tracking-[0.15em]
                    font-semibold
                    mb-5
                  "
                  style={{
                    color:
                      secondaryColor,
                  }}
                >
                  {institucionNombre}
                </p>

                <h2
                  className="
                    text-3xl
                    md:text-4xl
                    lg:text-5xl
                    font-bold
                    tracking-tight
                    leading-tight
                    mb-8
                  "
                  style={{
                    color:
                      primaryColor,

                    textShadow:
                      "0 2px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  {extractPlainText(
                    primerVideo.video_titulo
                  ).slice(0, 100)}
                </h2>

                <div
                  className="
                    text-gray-700
                    leading-[1.9]
                    text-[18px]
                    space-y-6
                    mb-10
                  "
                  dangerouslySetInnerHTML={{
                    __html:
                      sanitizeHTML(
                        primerVideo.video_breve_descripcion
                      ),
                  }}
                />

                <Link href="/videos">

                  <Button
                    size="lg"
                    className="
                      rounded-2xl
                      px-8
                      group
                      text-white
                      text-[16px]
                      shadow-xl
                    "
                    style={{
                      background: `
                        linear-gradient(
                          135deg,
                          ${primaryColor},
                          ${secondaryColor}
                        )
                      `,
                    }}
                  >
                    Ver más videos

                    <ArrowRight
                      className="
                        ml-2
                        w-4
                        h-4
                        group-hover:translate-x-1
                        transition-transform
                      "
                    />
                  </Button>
                </Link>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}