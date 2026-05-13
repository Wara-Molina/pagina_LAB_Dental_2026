"use client"

import { useEffect, useRef, useState, memo } from "react"

import Link from "next/link"

import api from "@/lib/axios"

import { Button } from "@/components/ui/button"

import {
  ArrowRight,
  BookOpen,
  Users,
  Target,
  Award,
  GraduationCap,
  ShieldCheck,
} from "lucide-react"

import {
  extractPlainText,
} from "@/lib/sanitize"

import { getStorageUrl } from "@/lib/utils"

interface ColorInstitucion {
  color_primario?: string | null
  color_secundario?: string | null
  color_terciario?: string | null
}

interface Institucion {
  institucion_id?: number | null
  institucion_nombre?: string | null
  institucion_iniciales?: string | null
  institucion_mision?: string | null
  institucion_vision?: string | null
  institucion_historia?: string | null
  institucion_logo?: string | null

  colorinstitucion?: ColorInstitucion[]
}

interface AboutData {
  institucion: Institucion | null
}

interface AboutProps {
  data: AboutData
  primaryColor: string
  secondaryColor: string
  tertiaryColor: string
}

const DEFAULT_PRIMARY = "#04246C"
const DEFAULT_SECONDARY = "#FC0102"
const DEFAULT_TERTIARY = "#020733"

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
  return isValidHexColor(color)
    ? color!
    : fallback
}

const sanitizeImageUrl = (
  url?: string | null
): string | null => {
  if (!url || typeof url !== "string") {
    return null
  }

  try {
    if (url.startsWith("http")) {
      const parsed = new URL(url)

      const allowedHosts = [
        "apiadministrador.upea.bo",
        "archivosminio.upea.bo",
      ]

      if (
        !allowedHosts.includes(parsed.hostname)
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

export function SobreNosotros() {
  const sectionRef =
    useRef<HTMLElement>(null)

  const [data, setData] =
    useState<AboutData>({
      institucion: null,
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] = useState<
    string | null
  >(null)

  const [activeTab, setActiveTab] =
    useState<"mision" | "vision">(
      "mision"
    )

  const institucionId = Number(
    process.env.NEXT_PUBLIC_INSTITUCION_ID
  )

  const safeInstitucionId =
    Number.isInteger(institucionId) &&
    institucionId > 0
      ? institucionId
      : 12

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await api.get(
          `/institucionesPrincipal/${safeInstitucionId}`
        )

        setData({
          institucion:
            res?.data?.Descripcion ||
            null,
        })
      } catch {
        setError(
          "No se pudo cargar la información institucional."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [safeInstitucionId])

  const colores =
    data.institucion
      ?.colorinstitucion?.[0]

  const primaryColor = getSafeColor(
    colores?.color_primario,
    DEFAULT_PRIMARY
  )

  const secondaryColor = getSafeColor(
    colores?.color_secundario,
    DEFAULT_SECONDARY
  )

  const tertiaryColor = getSafeColor(
    colores?.color_terciario,
    DEFAULT_TERTIARY
  )

  if (loading) {
    return (
      <section className="py-24 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div
            className="w-12 h-12 border-4 border-slate-300 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderTopColor:
                primaryColor,
            }}
          />

          <p className="text-slate-600">
            Cargando información...
          </p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-24 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div className="text-5xl mb-4">
            ⚠️
          </div>

          <h2 className="text-2xl font-bold mb-2 text-slate-900">
            Error de conexión
          </h2>

          <p className="text-slate-600 mb-6">
            {error}
          </p>

          <Button
            onClick={() =>
              window.location.reload()
            }
            style={{
              backgroundColor:
                primaryColor,
            }}
          >
            Reintentar
          </Button>
        </div>
      </section>
    )
  }

  if (safeInstitucionId === 34) {
    return (
      <SobreNosotrosDental
        data={data}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        tertiaryColor={tertiaryColor}
      />
    )
  }

  return (
    <SobreNosotrosDefault
      data={data}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      tertiaryColor={tertiaryColor}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sectionRef={sectionRef}
    />
  )
}

const SobreNosotrosDefault = memo(
  function SobreNosotrosDefault({
    data,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    activeTab,
    setActiveTab,
    sectionRef,
  }: AboutProps & {
    activeTab: "mision" | "vision"
    setActiveTab: (
      tab: "mision" | "vision"
    ) => void
    sectionRef: React.RefObject<HTMLElement | null>
  }) {
    const institucionNombre =
      extractPlainText(
        data.institucion
          ?.institucion_nombre || ""
      ).slice(0, 100) || "UPEA"

    const institucionIniciales =
      extractPlainText(
        data.institucion
          ?.institucion_iniciales || ""
      ).slice(0, 20)

    const misionText =
      extractPlainText(
        data.institucion
          ?.institucion_mision || ""
      ) ||
      "Información institucional próximamente disponible."

    const visionText =
      extractPlainText(
        data.institucion
          ?.institucion_vision || ""
      ) ||
      "Información institucional próximamente disponible."

    return (
      <section
        ref={sectionRef}
        id="sobre-nosotros"
        className="py-20 lg:py-32 relative"
        style={{
          background: `linear-gradient(180deg, #fff 0%, ${primaryColor}08 50%, #fff 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{
                backgroundColor: `${secondaryColor}15`,
                color: secondaryColor,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    secondaryColor,
                }}
              />

              {institucionIniciales}
            </span>

            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 break-words"
              style={{
                color: primaryColor,
              }}
            >
              Sobre {institucionNombre}
            </h2>

            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Excelencia académica y
              compromiso social.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-slate-100 aspect-[4/5]">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap
                    className="w-28 h-28"
                    style={{
                      color:
                        primaryColor,
                    }}
                  />
                </div>

                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, ${tertiaryColor}40 0%, transparent 60%)`,
                  }}
                />
              </div>

              <div
                className="absolute mt-[-50px] ml-6 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-sm border"
                style={{
                  backgroundColor: `${primaryColor}F5`,
                  borderColor: `${primaryColor}40`,
                }}
              >
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-white" />

                  <div className="text-white">
                    <p className="text-2xl font-bold">
                      15+
                    </p>

                    <p className="text-xs opacity-90">
                      Años formando
                      profesionales
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="flex gap-2 mb-6 p-1 rounded-xl bg-slate-100 w-fit">
                <button
                  onClick={() =>
                    setActiveTab(
                      "mision"
                    )
                  }
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab ===
                    "mision"
                      ? "shadow-sm"
                      : ""
                  }`}
                  style={
                    activeTab ===
                    "mision"
                      ? {
                          backgroundColor:
                            "#fff",
                          color:
                            primaryColor,
                        }
                      : {
                          color:
                            "#666",
                        }
                  }
                >
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Misión
                  </span>
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      "vision"
                    )
                  }
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab ===
                    "vision"
                      ? "shadow-sm"
                      : ""
                  }`}
                  style={
                    activeTab ===
                    "vision"
                      ? {
                          backgroundColor:
                            "#fff",
                          color:
                            primaryColor,
                        }
                      : {
                          color:
                            "#666",
                        }
                  }
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Visión
                  </span>
                </button>
              </div>

              <div className="mb-10">
                <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-line">
                  {activeTab ===
                  "mision"
                    ? misionText
                    : visionText}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                {[
                  {
                    icon: Users,
                    value: "1000+",
                    label:
                      "Estudiantes",
                    color:
                      primaryColor,
                  },
                  {
                    icon: Award,
                    value: "100%",
                    label:
                      "Acreditada",
                    color:
                      secondaryColor,
                  },
                  {
                    icon: BookOpen,
                    value: "20+",
                    label:
                      "Programas",
                    color:
                      tertiaryColor,
                  },
                ].map(
                  (stat, i) => (
                    <div
                      key={i}
                      className="text-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <stat.icon
                        className="w-6 h-6 mx-auto mb-2"
                        style={{
                          color:
                            stat.color,
                        }}
                      />

                      <p
                        className="text-xl font-bold"
                        style={{
                          color:
                            stat.color,
                        }}
                      >
                        {stat.value}
                      </p>

                      <p className="text-xs text-slate-500">
                        {
                          stat.label
                        }
                      </p>
                    </div>
                  )
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/informacion?section=historia">
                  <Button
                    className="rounded-full px-7 py-6 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow"
                    style={{
                      backgroundColor:
                        primaryColor,
                    }}
                  >
                    Nuestra Historia

                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/informacion?section=autoridades">
                  <Button
                    variant="outline"
                    className="rounded-full px-7 py-6 text-sm font-medium border-2 hover:bg-slate-50 transition-colors"
                    style={{
                      borderColor:
                        primaryColor,
                      color:
                        primaryColor,
                    }}
                  >
                    Conoce al Equipo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
)

const SobreNosotrosDental = memo(
  function SobreNosotrosDental({
    data,
    primaryColor,
    secondaryColor,
    tertiaryColor,
  }: AboutProps) {
    const institucionNombre =
      extractPlainText(
        data.institucion
          ?.institucion_nombre || ""
      ).slice(0, 100) ||
      "LABORATORIO DENTAL"

    const institucionIniciales =
      extractPlainText(
        data.institucion
          ?.institucion_iniciales || ""
      ).slice(0, 20)

    const mision =
      extractPlainText(
        data.institucion
          ?.institucion_mision || ""
      ) ||
      "Formación profesional con excelencia académica y compromiso científico."

    const vision =
      extractPlainText(
        data.institucion
          ?.institucion_vision || ""
      ) ||
      "Ser referente nacional en innovación y calidad educativa."

    const logoUrl =
      sanitizeImageUrl(
        data.institucion
          ?.institucion_logo
      )

    return (
      <section
        id="sobre-nosotros"
        className="relative py-24 lg:py-36 overflow-hidden"
      >
<div className="absolute inset-0 bg-white">
  <div
    className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-10"
    style={{
      background: secondaryColor,
    }}
  />

  <div
    className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-10"
    style={{
      background: primaryColor,
    }}
  />
</div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/20 bg-white backdrop-blur-xl text-white mb-8">
                <ShieldCheck className="w-5 h-5" />

                <span className="text-sm tracking-wide">
                  {
                    institucionIniciales
                  }
                </span>
              </div>

              <h2
className="text-5xl md:text-6xl xl:text-7xl font-black leading-[1.05] text-slate-900 tracking-tight break-words"
                style={{
                  WebkitTextStroke:
                    "1px rgba(0,0,0,0.25)",
                  textShadow: `
                    0 2px 10px rgba(0,0,0,0.35),
                    0 4px 25px rgba(0,0,0,0.25)
                  `,
                }}
              >
                {institucionNombre}
              </h2>

              <div
                className="w-28 h-1 rounded-full mt-8 mb-10"
                style={{
                  background:
                    secondaryColor,
                }}
              />

              <div className="space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white backdrop-blur-2xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{
                        background:
                          primaryColor,
                      }}
                    >
                      <Target className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900">
                      Misión
                    </h3>
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    {mision}
                  </p>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white backdrop-blur-2xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{
                        background:
                          secondaryColor,
                      }}
                    >
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>

<h3 className="text-2xl font-bold text-slate-900">
                      Visión
                    </h3>
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    {vision}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-visible min-h-[700px] flex items-center justify-center">
              <div className="relative z-20 w-full max-w-[520px] rounded-[40px] overflow-hidden border border-slate-200 bg-white backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.45)] p-10">
                <div className="aspect-[4/5] rounded-[30px] overflow-hidden relative bg-white/5">
<img
  src="/imagenes/imagen_upea.jpg"
  alt={institucionNombre}
  loading="lazy"
  decoding="async"
  className="w-full h-full object-cover"
  onError={(e) => {
    const target =
      e.currentTarget

    target.style.display = "none"
  }}
/>

                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to top, ${tertiaryColor}99 0%, transparent 70%)`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-8">
                  {[
                    {
                      label:
                        "Acreditación",
                      value: "100%",
                    },
                    {
                      label:
                        "Estudiantes",
                      value: "1000+",
                    },
                    {
                      label:
                        "Trayectoria",
                      value: "15+",
                    },
                  ].map(
                    (item, index) => (
                      <div
                        key={index}
                        className="rounded-2xl bg-white border border-slate-200 backdrop-blur-xl p-4 text-center"
                      >
<p className="text-2xl font-bold text-slate-900">
                          {
                            item.value
                          }
                        </p>

<p className="text-xs text-slate-500 mt-1">
                          {
                            item.label
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div
                className="absolute bottom-[30px] -left-[40px] z-[60] rounded-[30px] border border-slate-200 bg-white backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)] p-6 w-[260px]"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  >
                    <Award className="w-7 h-7 text-white" />
                  </div>

<div>
  <p className="text-slate-500 text-sm">
    Institución acreditada
  </p>

  <h3 className="text-slate-900 text-2xl font-bold leading-tight mt-1">
    Calidad Académica
  </h3>
</div>


                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
)