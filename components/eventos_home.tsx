"use client"

import {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react"

import Link from "next/link"

import {
  Calendar,
  Clock,
  ArrowRight,
  MapPin,
} from "lucide-react"

import api from "@/lib/axios"

import {
  getStorageUrl,
} from "@/lib/utils"

import {
  extractPlainText,
} from "@/lib/sanitize"

import CalendarWidget, {
  EventoItem,
} from "@/components/CalendarWidget"

interface Institucion {
  institucion_nombre?: string | null

  institucion_iniciales?: string | null

  colorinstitucion?: Array<{
    color_primario?: string | null
    color_secundario?: string | null
    color_terciario?: string | null
  }>
}

interface EventsData {
  eventos: EventoItem[]

  institucion: Institucion | null
}

const isValidHexColor = (
  color?: string | null
): boolean => {
  if (!color) return false

  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(
    color
  )
}

const getSafeColor = (
  color: string | undefined | null,
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

const sanitizeImageUrl = (
  url?: string | null
): string | null => {
  if (
    !url ||
    typeof url !== "string"
  ) {
    return null
  }

  try {
    if (url.startsWith("http")) {
      const parsed =
        new URL(url)

      const allowedHosts = [
        "apiadministrador.upea.bo",
        "archivosminio.upea.bo",
      ]

      if (
        !allowedHosts.includes(
          parsed.hostname
        )
      ) {
        return null
      }

      return parsed.toString()
    }

    return getStorageUrl(url)
  } catch {
    return null
  }
}

const formatDate = (
  value?: string | null
): string => {
  if (!value) {
    return "Fecha por definir"
  }

  try {
    return new Date(
      value
    ).toLocaleDateString(
      "es-BO",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    )
  } catch {
    return "Fecha por definir"
  }
}

export function EventosHome() {
  const sectionRef =
    useRef<HTMLElement>(null)

  const [data, setData] =
    useState<EventsData>({
      eventos: [],
      institucion: null,
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(
      null
    )

  const [currentEvent, setCurrentEvent] =
    useState(0)

  /*
   * ID INSTITUCIÓN
   */

  const institucionId = Number(
    process.env
      .NEXT_PUBLIC_INSTITUCION_ID
  )

  const safeInstitucionId =
    Number.isInteger(
      institucionId
    ) &&
    institucionId > 0
      ? institucionId
      : 12

  /*
   * FETCH
   */

  useEffect(() => {
    const fetchData =
      async () => {
        try {
          setLoading(true)

          setError(null)

          const results =
            await Promise.allSettled([
              api.get(
                `/institucion/${safeInstitucionId}/gacetaEventos`
              ),

              api.get(
                `/institucionesPrincipal/${safeInstitucionId}`
              ),
            ])

          const gacetaRes =
            results[0]
              .status ===
            "fulfilled"
              ? results[0]
                  .value
              : null

          const instRes =
            results[1]
              .status ===
            "fulfilled"
              ? results[1]
                  .value
              : null

          const eventos =
            Array.isArray(
              gacetaRes
                ?.data
                ?.upea_evento
            )
              ? gacetaRes
                  .data
                  .upea_evento
              : []

          setData({
            eventos,

            institucion:
              instRes?.data
                ?.Descripcion ||
              null,
          })
        } catch {
          setError(
            "No se pudieron cargar los eventos."
          )
        } finally {
          setLoading(false)
        }
      }

    fetchData()
  }, [
    safeInstitucionId,
  ])

  /*
   * AUTOPLAY
   */

  useEffect(() => {
    if (
      data.eventos.length <=
      1
    )
      return

    const interval =
      setInterval(() => {
        setCurrentEvent(
          (prev) =>
            (prev + 1) %
            data.eventos
              .length
        )
      }, 6000)

    return () =>
      clearInterval(
        interval
      )
  }, [data.eventos])

  /*
   * COLORES
   */

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

  /*
   * TEXTOS
   */

  const institucionNombre =
    extractPlainText(
      data.institucion
        ?.institucion_nombre ||
        ""
    ) || "UPEA"

  /*
   * STATS
   */

  const eventosDelMes =
    useMemo(() => {
      const now =
        new Date()

      return data.eventos.filter(
        (
          evento
        ) => {
          if (
            !evento?.evento_fecha
          ) {
            return false
          }

          const eventDate =
            new Date(
              evento.evento_fecha
            )

          return (
            eventDate.getMonth() ===
              now.getMonth() &&
            eventDate.getFullYear() ===
              now.getFullYear()
          )
        }
      ).length
    }, [data.eventos])

  const diasConEventos =
    useMemo(() => {
      const uniqueDays =
        new Set(
          data.eventos.map(
            (
              e
            ) =>
              new Date(
                e.evento_fecha ||
                  ""
              ).getDate()
          )
        )

      return uniqueDays.size
    }, [data.eventos])

  /*
   * LOADING
   */

  if (loading) {
    return (
      <section
        className="
          py-24
          lg:py-32
          relative
          overflow-hidden
          font-serif
        "
        style={{
          fontFamily: `
            "Times New Roman",
            serif
          `,
        }}
      >
        <div
          className="
            absolute
            inset-0
            bg-cover
            bg-center
          "
          style={{
            backgroundImage:
              "url('/imagenes/imagen_upea.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-[#00000090]" />

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            px-6
            lg:px-8
            text-center
          "
        >
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
            Cargando eventos...
          </p>
        </div>
      </section>
    )
  }

  /*
   * ERROR
   */

  if (error) {
    return (
      <section
        className="
          py-24
          lg:py-32
          relative
          overflow-hidden
          font-serif
        "
        style={{
          fontFamily: `
            "Times New Roman",
            serif
          `,
        }}
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

        <div className="absolute inset-0 bg-[#00000090]" />

        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            px-6
            lg:px-8
            text-center
          "
        >
          <p className="text-white mb-6 text-lg">
            {error}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="
              px-6
              py-3
              rounded-xl
              text-white
              font-semibold
            "
            style={{
              backgroundColor:
                primaryColor,
            }}
          >
            Reintentar
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      id="eventos"
      className="
        relative
        overflow-hidden
        py-24
        lg:py-32
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
       
        }}
      />

      {/* OVERLAY */}

      <div className="absolute inset-0 bg-[#0f172acc]" />

      {/* LIGHT */}

      <div
        className="
          absolute
          top-0
          left-0
          w-full
          h-full
          opacity-20
        "
        style={{
          background: `
            radial-gradient(
              circle at top left,
              ${primaryColor},
              transparent 40%
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
              text-sm
              font-semibold
              mb-8
              border
              backdrop-blur-xl
              bg-white/10
              border-white/20
              text-white
            "
          >
            <span
              className="
                w-2.5
                h-2.5
                rounded-full
              "
              style={{
                backgroundColor:
                  secondaryColor,
              }}
            />

            Agenda Académica
          </div>

          <h1
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
              textShadow:
                "0 8px 30px rgba(0,0,0,0.45)",
            }}
          >
            Eventos{" "}
            {
              institucionNombre
            }
          </h1>

          <div
            className="
              w-32
              h-1
              rounded-full
              mx-auto
              mb-8
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
              text-white/85
              text-xl
              leading-relaxed
            "
          >
            Descubre seminarios,
            congresos,
            talleres y
            actividades
            académicas
            organizadas por la
            institución.
          </p>
        </div>

        {/* STATS */}

        <div
          className="
            grid
            grid-cols-2
            lg:grid-cols-4
            gap-6
            mb-16
          "
        >
          {[
            {
              label:
                "Eventos",
              value:
                data.eventos
                  .length,
              color:
                primaryColor,
            },

            {
              label:
                "Mes actual",
              value:
                eventosDelMes,
              color:
                secondaryColor,
            },

            {
              label:
                "Días activos",
              value:
                diasConEventos,
              color:
                "#ffffff",
            },

            {
              label:
                "Disponibilidad",
              value:
                "24/7",
              color:
                primaryColor,
            },
          ].map(
            (
              item,
              index
            ) => (
              <div
                key={index}
                className="
                  rounded-[32px]
                  bg-white/10
                  backdrop-blur-2xl
                  border
                  border-white/20
                  shadow-2xl
                  p-8
                  text-center
                "
              >
                <p
                  className="
                    text-4xl
                    font-bold
                  "
                  style={{
                    color:
                      item.color,
                  }}
                >
                  {
                    item.value
                  }
                </p>

                <p className="text-white/70 mt-2">
                  {
                    item.label
                  }
                </p>
              </div>
            )
          )}
        </div>

        {/* GRID */}

        <div className="grid xl:grid-cols-[1fr_360px] gap-10">

          {/* HERO */}

          <div>
            {data.eventos
              .slice(
                currentEvent,
                currentEvent + 1
              )
              .map(
                (
                  evento
                ) => {
                  const titulo =
                    extractPlainText(
                      evento?.evento_titulo ||
                        "Evento"
                    )

                  const descripcion =
                    extractPlainText(
                      evento?.evento_descripcion ||
                        "Información próximamente disponible."
                    ).slice(
                      0,
                      220
                    )

                  const imageUrl =
                    sanitizeImageUrl(
                      evento?.evento_imagen
                    )

                  return (
                    <Link
                      key={
                        evento?.evento_id
                      }
                      href={`/eventos/${evento?.evento_id}`}
                      className="group block"
                    >
                      <article
                        className="
                          relative
                          overflow-hidden
                          rounded-[40px]
                          min-h-[650px]
                          shadow-2xl
                          border
                          border-white/20
                        "
                      >
                        <div className="absolute inset-0">
                          {imageUrl ? (
                            <img
                              src={
                                imageUrl
                              }
                              alt={
                                titulo
                              }
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="
                                w-full
                                h-full
                                object-cover
                                group-hover:scale-105
                                transition-transform
                                duration-[4000ms]
                              "
                            />
                          ) : (
                            <div
                              className="
                                w-full
                                h-full
                              "
                              style={{
                                backgroundColor:
                                  primaryColor,
                              }}
                            />
                          )}

                          <div
                            className="
                              absolute
                              inset-0
                              bg-gradient-to-t
                              from-black/90
                              via-black/50
                              to-black/10
                            "
                          />
                        </div>

                        <div
                          className="
                            relative
                            z-10
                            flex
                            flex-col
                            justify-end
                            h-full
                            p-8
                            md:p-14
                          "
                        >
                          <div
                            className="
                              inline-flex
                              items-center
                              gap-3
                              px-5
                              py-2
                              rounded-full
                              backdrop-blur-xl
                              bg-white/10
                              border
                              border-white/20
                              text-white
                              text-sm
                              font-semibold
                              w-fit
                              mb-6
                            "
                          >
                            <span
                              className="
                                w-2.5
                                h-2.5
                                rounded-full
                              "
                              style={{
                                backgroundColor:
                                  secondaryColor,
                              }}
                            />

                            Evento Académico
                          </div>

                          <h2
                            className="
                              text-4xl
                              md:text-6xl
                              font-bold
                              leading-tight
                              text-white
                              max-w-4xl
                              mb-6
                            "
                          >
                            {
                              titulo
                            }
                          </h2>

                          <p
                            className="
                              text-white/85
                              text-lg
                              md:text-xl
                              leading-relaxed
                              max-w-3xl
                              mb-10
                            "
                          >
                            {
                              descripcion
                            }
                          </p>

                          <div className="flex flex-wrap items-center gap-6">
                            <div
                              className="
                                flex
                                items-center
                                gap-2
                                text-white/80
                              "
                            >
                              <Calendar className="w-5 h-5" />

                              <span>
                                {formatDate(
                                  evento?.evento_fecha
                                )}
                              </span>
                            </div>

                            {evento?.evento_hora && (
                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                  text-white/80
                                "
                              >
                                <Clock className="w-5 h-5" />

                                <span>
                                  {evento.evento_hora.slice(
                                    0,
                                    5
                                  )}
                                </span>
                              </div>
                            )}

                            {evento?.evento_lugar && (
                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                  text-white/80
                                "
                              >
                                <MapPin className="w-5 h-5" />

                                <span>
                                  {extractPlainText(
                                    evento.evento_lugar
                                  )}
                                </span>
                              </div>
                            )}

                            <div
                              className="
                                ml-auto
                                w-16
                                h-16
                                rounded-2xl
                                flex
                                items-center
                                justify-center
                                backdrop-blur-xl
                                bg-white/10
                                border
                                border-white/20
                              "
                            >
                              <ArrowRight className="w-7 h-7 text-white" />
                            </div>
                          </div>
                        </div>
                      </article>
                    </Link>
                  )
                }
              )}
          </div>

          {/* CALENDARIO */}

          <div
            className="
              rounded-[36px]
              bg-white/10
              backdrop-blur-2xl
              border
              border-white/20
              shadow-2xl
              p-8
              h-fit
              sticky
              top-28
            "
          >
            <div className="flex items-center gap-4 mb-8">
              <div
                className="
                  w-14
                  h-14
                  rounded-2xl
                  flex
                  items-center
                  justify-center
                  bg-white/10
                "
              >
                <Calendar
                  className="
                    w-7
                    h-7
                    text-white
                  "
                />
              </div>

              <div>
                <h3
                  className="
                    text-2xl
                    font-bold
                    text-white
                  "
                >
                  Calendario
                </h3>

                <p className="text-white/60">
                  Agenda institucional
                </p>
              </div>
            </div>

            <CalendarWidget
              colores={{
                color_primario:
                  primaryColor,

                color_secundario:
                  secondaryColor,
              }}
              eventos={
                data.eventos
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}