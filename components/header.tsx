// components/header.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  X,
  ChevronDown,
  LogIn,
  User,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import DOMPurify from 'dompurify';

import api from '@/lib/axios';

interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface InstitucionData {
  institucion_id: number;
  institucion_nombre: string;
  institucion_iniciales: string;
  institucion_logo?: string;
  colorinstitucion: ColorInstitucion[];
}

interface CursoItem {
  id: number;
  nombre: string;
  url: string;
  tipo: string;
}

interface ComunicadoItem {
  id: number;
  titulo: string;
  url: string;
  tipo: 'CONVOCATORIAS' | 'AVISOS' | 'COMUNICADOS';
}

interface EnlaceItem {
  id: number;
  nombre: string;
  url: string;
  tipo: string;
}

interface MenuItem {
  label: string;
  href?: string;
  items?: Array<{
    label: string;
    href: string;
    external?: boolean;
    separator?: boolean;
  }>;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

const isLightColor = (hex: string): boolean => {
  if (!hex || typeof hex !== 'string') return false;

  const color = hex.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(color)) return false;

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
};

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const sanitizeText = (text: string | undefined): string => {
  if (!text) return '';

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
};


export function Header() {
const institucionId = Number(
  process.env.NEXT_PUBLIC_INSTITUCION_ID
);
  const [institucion, setInstitucion] =
    useState<InstitucionData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState('#04246C');

  const [secondaryColor, setSecondaryColor] = useState('#FC0102');

  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  const [cursosItems, setCursosItems] = useState<CursoItem[]>([]);

  const [comunicadosItems, setComunicadosItems] = useState<
    ComunicadoItem[]
  >([]);

  const [enlacesItems, setEnlacesItems] = useState<EnlaceItem[]>([]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<string | null>(
    null
  );

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const isLightBackground = isLightColor(tertiaryColor);

  const textColor = isLightBackground
    ? 'text-gray-900'
    : 'text-white';

  const textColorHover = isLightBackground
    ? 'hover:text-gray-700'
    : 'hover:text-white';

  const textColorMuted = isLightBackground
    ? 'text-gray-600'
    : 'text-white/70';

  const textColorDimmed = isLightBackground
    ? 'text-gray-500'
    : 'text-white/60';

  const borderColor = isLightBackground
    ? 'border-gray-200'
    : 'border-white/10';

  const hoverBg = isLightBackground
    ? 'hover:bg-gray-100'
    : 'hover:bg-white/10';

  const dropdownBg = isLightBackground
    ? 'bg-white'
    : tertiaryColor;

  const dropdownText = isLightBackground
    ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
    : 'text-white/90 hover:text-white hover:bg-white/10';

  useEffect(() => {
    if (!institucionId) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        setError(null);

      const results = await Promise.allSettled([
  api.get(`/institucionesPrincipal/${institucionId}`),

  api.get(
    `/institucion/${institucionId}/recursos`
  ),

  api.get(
    `/institucion/${institucionId}/gacetaEventos`
  ),
]);

const instRes =
  results[0].status === 'fulfilled'
    ? results[0].value
    : null;

const recursosRes =
  results[1].status === 'fulfilled'
    ? results[1].value
    : null;

const gacetaRes =
  results[2].status === 'fulfilled'
    ? results[2].value
    : null;

        if (!isMounted) return;

      const instData = instRes?.data?.Descripcion;

        if (instData) {
          setInstitucion(instData);

          if (instData.colorinstitucion?.[0]) {
            setPrimaryColor(
              instData.colorinstitucion[0].color_primario ||
                '#04246C'
            );

            setSecondaryColor(
              instData.colorinstitucion[0]
                .color_secundario || '#FC0102'
            );

            setTertiaryColor(
              instData.colorinstitucion[0].color_terciario ||
                '#020733'
            );
          }
        }
if (recursosRes?.data?.linksExternoInterno) {
          const enlaces =
            recursosRes.data.linksExternoInterno
              .filter(
                (l: any) =>
                  l?.estado === 1 &&
                  isValidUrl(l?.url_link)
              )
              .map((l: any) => ({
                id: Number(l.id_link),
                nombre: sanitizeText(l.nombre),
                url: l.url_link,
                tipo: sanitizeText(l.tipo),
              }));

          setEnlacesItems(enlaces);
        }

       if (gacetaRes?.data?.cursos) {
          const cursos = gacetaRes.data.cursos
            .filter(
              (c: any) =>
                c.det_estado === '1' &&
                c.tipo_curso_otro
            )
            .map((c: any) => ({
              id: Number(c.iddetalle_cursos_academicos),
              nombre: sanitizeText(c.det_titulo),
              url: `/cursos/${Number(
                c.iddetalle_cursos_academicos
              )}`,
              tipo:
                sanitizeText(
                  c.tipo_curso_otro
                    ?.tipo_conv_curso_nombre
                ).toUpperCase() || 'CURSOS',
            }));

          setCursosItems(cursos);
        }

      if (gacetaRes?.data?.convocatorias){
          const comunicados =
            gacetaRes.data.convocatorias
              .filter(
                (c: any) =>
                  c.con_estado === '1' &&
                  c.tipo_conv_comun
              )
              .map((c: any) => ({
                id: Number(c.idconvocatorias),
                titulo: sanitizeText(c.con_titulo),
                url: `/comunicados/${Number(
                  c.idconvocatorias
                )}`,
                tipo:
                  sanitizeText(
                    c.tipo_conv_comun
                      ?.tipo_conv_comun_titulo
                  ).toUpperCase() || 'COMUNICADOS',
              }));

          setComunicadosItems(comunicados);
        }
      } catch (err: any) {
        if (isMounted) {
          const msg =
            process.env.NODE_ENV === 'development'
              ? err?.message || 'Error cargando datos'
              : 'No se pudo cargar el menú';

          setError(msg);

          console.warn('Header API Error:', err);
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

  useEffect(() => {
    try {
      const token = localStorage.getItem('auth_token');

      const userData = localStorage.getItem('user_data');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);

        if (
          parsedUser &&
          typeof parsedUser === 'object'
        ) {
          setUsuario(parsedUser);
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }

    setOpenDropdown(label);
  };

  const handleDropdownLeave = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }

    dropdownTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(
      openDropdown === name ? null : name
    );
  };

  const getComunicadosByTipo = (
    tipo: ComunicadoItem['tipo']
  ) => comunicadosItems.filter((c) => c.tipo === tipo);

  const handleLogout = () => {
    try {
      localStorage.removeItem('auth_token');

      localStorage.removeItem('user_data');
    } catch {
      // silent
    }

    setUsuario(null);

    setUserMenuOpen(false);

    window.location.href = '/';
  };

  const handleLinkClick = (
    isMobile: boolean,
    isExternal: boolean = false
  ) => {
    if (isMobile) setMobileMenuOpen(false);

    if (!isExternal) {
      setTimeout(() => setOpenDropdown(null), 100);
    }
  };

  const menuItems: MenuItem[] = [
    { label: 'Inicio', href: '/' },
    {
      label: 'Información',
      items: [
        {
          label: 'Misión y Visión',
          href: '/informacion?section=mision-vision',
        },
        {
          label: 'Autoridades',
          href: '/informacion?section=autoridades',
        },
        {
          label: 'Historia',
          href: '/informacion?section=historia',
        },
        {
          label: 'Ubicación',
          href: '/informacion?section=ubicacion',
        },
      ],
    },
    { label: 'Cursos', href: '/cursos' },
    {
      label: 'Comunicados',
      items: [
        {
          label: `Convocatorias (${getComunicadosByTipo(
            'CONVOCATORIAS'
          ).length})`,
          href: '/comunicados?tipo=CONVOCATORIAS',
        },
        {
          label: `Avisos (${getComunicadosByTipo(
            'AVISOS'
          ).length})`,
          href: '/comunicados?tipo=AVISOS',
        },
        {
          label: `Comunicados (${getComunicadosByTipo(
            'COMUNICADOS'
          ).length})`,
          href: '/comunicados?tipo=COMUNICADOS',
        },
      ],
    },
    {
      label: 'Instituto de Investigación',
      href: '/institutoInvestigacion',
    },
    {
      label: 'Más',
      items: [
        { label: 'Publicaciones', href: '/publicaciones' },
        { label: 'Eventos', href: '/eventos' },
        { label: 'Gacetas', href: '/gacetas' },
        { label: 'Videos', href: '/videos' },
        { label: 'Contacto', href: '/contacto' },
        { label: 'Sedes', href: '/sedes' },
        {
          label: '─'.repeat(20),
          href: '#',
          separator: true,
        },
        ...(enlacesItems.length > 0
          ? enlacesItems.map((enlace) => ({
              label: enlace.nombre,
              href: enlace.url,
              external: true,
            }))
          : [
              {
                label: 'Campus Virtual',
                href: '#',
                external: true,
              },
              {
                label: 'Biblioteca',
                href: '#',
                external: true,
              },
            ]),
      ],
    },
  ];

  const logoUrl = institucion?.institucion_logo;

  const institucionNombre =
    sanitizeText(institucion?.institucion_nombre) ||
    'UPEA';

  const institucionIniciales =
    sanitizeText(
      institucion?.institucion_iniciales
    ) || '';
  const renderDropdownItems = (
    items: MenuItem['items'],
    isMobile = false
  ) => {
    if (!items) return null;

    return items.map((item: any, idx: number) => {
      if (item.separator) {
        return (
          <div
            key={idx}
            className={`my-1 border-t ${borderColor}`}
          />
        );
      }

      if (item.external && isValidUrl(item.href)) {
        return (
          <a
            key={idx}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`block px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${dropdownText}`}
            onClick={() => {
              if (isMobile) setMobileMenuOpen(false);

              setOpenDropdown(null);
            }}
          >
            <span className="truncate">{item.label}</span>

            <ExternalLink
              className={`w-3 h-3 flex-shrink-0 ${textColorDimmed}`}
            />
          </a>
        );
      }

      return (
        <Link
          key={idx}
          href={item.href || '#'}
          className={`block px-4 py-2.5 text-sm transition-colors ${dropdownText}`}
          onClick={() => handleLinkClick(isMobile)}
        >
          {item.label}
        </Link>
      );
    });
  };

  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
        <nav className="max-w-7xl mx-auto bg-white/80 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between h-20 px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />

              <div className="hidden lg:block space-y-2">
                <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />

                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-20 h-4 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>

            <div className="w-24 h-9 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </nav>
      </header>
    );
  }

  if (error) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 p-4">
        <nav className="max-w-7xl mx-auto bg-red-50 border border-red-200 rounded-3xl px-6 py-3">
          <p className="text-sm text-red-600 text-center">
            {error}
          </p>
        </nav>
      </header>
    );
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6 transition-colors duration-300"
      style={
        {
          '--nav-bg': `${tertiaryColor}15`,
        } as React.CSSProperties
      }
    >
      <nav
        className="max-w-7xl mx-auto backdrop-blur-md border rounded-3xl shadow-lg transition-colors duration-300"
        style={{
          backgroundColor: isLightBackground
            ? 'rgba(255,255,255,0.85)'
            : `${tertiaryColor}80`,
          borderColor: isLightBackground
            ? 'rgba(0,0,0,0.1)'
            : 'rgba(255,255,255,0.15)',
        }}
      >
        <div className="flex items-center justify-between h-20 px-4 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 group flex-shrink-0"
          >
            <div className="relative w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl shadow-md overflow-hidden flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`Logo de ${institucionNombre}`}
                  fill
                  sizes="(max-width: 790px) 40px, 48px"
                  className="object-contain p-1.5"
                  loading="eager"
                  onError={(e) => {
                    const target =
                      e.target as HTMLImageElement;

                    target.style.display = 'none';

                    if (target.parentElement) {
                      target.parentElement.innerHTML = `
                        <div class="flex items-center justify-center w-full h-full">
                          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                          </svg>
                        </div>
                      `;
                    }
                  }}
                />
              ) : (
                <BookOpen
                  className={`w-6 h-6 ${textColorDimmed}`}
                />
              )}
            </div>

            <div className="hidden lg:block">
              <h1
                className={`font-serif text-lg font-medium leading-tight ${textColor} transition-colors`}
              >
                {institucionNombre}
              </h1>

              {institucionIniciales && (
                <p
                  className={`text-xs ${textColorMuted} font-medium`}
                >
                  {institucionIniciales}
                </p>
              )}
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {menuItems.map((item) => (
              <div
                key={item.label}
                className="relative"
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${textColor} ${textColorHover} ${hoverBg}`}
                    onMouseEnter={() =>
                      handleDropdownLeave()
                    }
                    onClick={() =>
                      handleLinkClick(false)
                    }
                  >
                    {item.label}
                  </Link>
                ) : (
                  <>
                    <button
                      className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1 rounded-lg ${textColor} ${textColorHover} ${hoverBg}`}
                      onMouseEnter={() =>
                        handleDropdownEnter(
                          item.label
                        )
                      }
                      onMouseLeave={
                        handleDropdownLeave
                      }
                      onClick={() =>
                        toggleDropdown(item.label)
                      }
                      aria-expanded={
                        openDropdown === item.label
                      }
                      aria-haspopup="true"
                    >
                      {item.label}

                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          openDropdown === item.label
                            ? 'rotate-180'
                            : ''
                        } ${textColorMuted}`}
                      />
                    </button>

                    {item.items &&
                      openDropdown === item.label && (
                        <div
                          role="menu"
                          className={`absolute top-full left-0 mt-2 w-56 rounded-xl shadow-xl py-2 z-50 max-h-80 overflow-y-auto border ${borderColor}`}
                          style={{
                            backgroundColor:
                              dropdownBg,
                          }}
                          onMouseEnter={() =>
                            handleDropdownEnter(
                              item.label
                            )
                          }
                          onMouseLeave={
                            handleDropdownLeave
                          }
                        >
                          {renderDropdownItems(
                            item.items
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            ))}
          </nav>

          {/* Auth + Mobile Toggle */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {usuario ? (
              <div className="relative">
                <button
                  className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full border-2 font-medium text-xs transition-all hover:shadow-lg ${textColor}`}
                  style={{
                    borderColor: secondaryColor,
                  }}
                  onClick={() =>
                    setUserMenuOpen(
                      !userMenuOpen
                    )
                  }
                  onMouseEnter={() =>
                    handleDropdownLeave()
                  }
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <User className="w-4 h-4" />

                  <span className="hidden xl:inline truncate max-w-24">
                    {usuario.nombre}
                  </span>

                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      userMenuOpen
                        ? 'rotate-180'
                        : ''
                    } ${textColorMuted}`}
                  />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className={`absolute top-full right-0 mt-2 w-48 rounded-xl shadow-xl py-2 z-50 border ${borderColor}`}
                    style={{
                      backgroundColor: dropdownBg,
                    }}
                    onMouseEnter={() =>
                      setUserMenuOpen(true)
                    }
                    onMouseLeave={() =>
                      setUserMenuOpen(false)
                    }
                  >
                    <Link
                      href="/perfil"
                      className={`block px-4 py-2.5 text-sm transition-colors ${dropdownText}`}
                      onClick={() => {
                        setUserMenuOpen(false);

                        setOpenDropdown(null);
                      }}
                    >
                      Mi Perfil
                    </Link>

                    <Link
                      href="/dashboard"
                      className={`block px-4 py-2.5 text-sm transition-colors ${dropdownText}`}
                      onClick={() => {
                        setUserMenuOpen(false);

                        setOpenDropdown(null);
                      }}
                    >
                      Dashboard
                    </Link>

                    <div
                      className={`my-1 border-t ${borderColor}`}
                    />

                    <button
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        isLightBackground
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-red-400 hover:bg-white/10'
                      }`}
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="https://servicioadministrador.upea.bo"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-2 px-4 lg:px-5 py-2.5 rounded-full font-semibold text-xs overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 flex-shrink-0"
                style={{
                  backgroundColor: secondaryColor,
                  color: '#ffffff',
                }}
                onMouseEnter={() =>
                  handleDropdownLeave()
                }
              >
                <LogIn className="w-4 h-4 relative z-10" />

                <span className="relative z-10 hidden sm:inline">
                  Iniciar Sesión
                </span>

                <span className="relative z-10 sm:hidden">
                  Login
                </span>
              </a>
            )}

            {/* Mobile */}
            <button
              className={`lg:hidden p-2.5 rounded-xl transition-colors ${textColor} ${hoverBg}`}
              onClick={() => {
                setMobileMenuOpen(
                  !mobileMenuOpen
                );

                setOpenDropdown(null);
              }}
              aria-label={
                mobileMenuOpen
                  ? 'Cerrar menú'
                  : 'Abrir menú'
              }
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden border-t px-4 pb-4 pt-2 space-y-1 max-h-[75vh] overflow-y-auto"
            style={{
              backgroundColor: isLightBackground
                ? 'rgba(255,255,255,0.95)'
                : `${tertiaryColor}F5`,
              borderColor: isLightBackground
                ? 'rgba(0,0,0,0.1)'
                : 'rgba(255,255,255,0.15)',
            }}
          >
            {menuItems.map((item) => (
              <div
                key={item.label}
                className={`border-b last:border-0 ${borderColor}`}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`block px-4 py-3 text-sm font-medium rounded-xl ${textColor} ${hoverBg}`}
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                  >
                    {item.label}
                  </Link>
                ) : (
                  <>
                    <button
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl ${textColor} ${hoverBg}`}
                      onClick={() =>
                        toggleDropdown(item.label)
                      }
                      aria-expanded={
                        openDropdown === item.label
                      }
                    >
                      <span>{item.label}</span>

                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          openDropdown === item.label
                            ? 'rotate-180'
                            : ''
                        } ${textColorMuted}`}
                      />
                    </button>

                    {openDropdown === item.label &&
                      item.items && (
                        <div
                          className="ml-4 mt-1 space-y-1 pb-2"
                          role="menu"
                        >
                          {renderDropdownItems(
                            item.items,
                            true
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            ))}

            <div
              className={`pt-3 border-t ${borderColor}`}
            >
              {usuario ? (
                <div className="space-y-2">
                  <div
                    className={`px-4 py-3 rounded-xl ${
                      isLightBackground
                        ? 'bg-gray-100'
                        : 'bg-white/10'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${textColor}`}
                    >
                      {usuario.nombre}
                    </p>

                    <p
                      className={`text-xs ${textColorMuted} truncate`}
                    >
                      {usuario.email}
                    </p>
                  </div>

                  <Link
                    href="/perfil"
                    className={`block px-4 py-3 text-sm rounded-xl ${textColor} ${hoverBg}`}
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                  >
                    👤 Mi Perfil
                  </Link>

                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-3 text-sm rounded-xl ${
                      isLightBackground
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-red-400 hover:bg-white/10'
                    }`}
                  >
                    🚪 Cerrar Sesión
                  </button>
                </div>
              ) : (
                <a
                  href="https://servicioadministrador.upea.bo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full font-semibold text-sm"
                  style={{
                    backgroundColor: secondaryColor,
                    color: '#ffffff',
                  }}
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                >
                  <LogIn className="w-4 h-4" />

                  Iniciar Sesión
                </a>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
