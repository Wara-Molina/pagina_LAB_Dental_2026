'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Calendar, FileText, Bell, Search, ArrowLeft, 
  Clock, ChevronLeft, ChevronRight, X, Megaphone
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML, sanitizeText, sanitizeQueryParam } from '@/lib/security';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

// ==================== TIPOS ====================
interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface Comunicado {
  idconvocatorias: number;
  con_foto_portada?: string;
  con_titulo: string;
  con_descripcion?: string;
  con_estado: string;
  con_fecha_inicio?: string;
  con_fecha_fin?: string;
  tipo_conv_comun?: {
    idtipo_conv_comun: number;
    tipo_conv_comun_titulo: string;
    tipo_conv_comun_estado: string;
  };
}

interface InstitucionData {
  institucion_nombre?: string;
  institucion_iniciales?: string;
  colorinstitucion: ColorInstitucion[];
}

type TipoComunicado = 'TODOS' | 'CONVOCATORIAS' | 'AVISOS' | 'COMUNICADOS';

// ==================== UTILIDADES ====================
const isValidHexColor = (color: string | undefined): boolean => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getSafeColor = (color: string | undefined, fallback: string): string => {
  return isValidHexColor(color) ? color! : fallback;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const searchComunicados = (comunicados: Comunicado[], query: string): Comunicado[] => {
  if (!query.trim()) return comunicados;
  const safeQuery = sanitizeQueryParam(query).toLowerCase();
  return comunicados.filter(c => 
    c.con_titulo.toLowerCase().includes(safeQuery) ||
    (c.con_descripcion?.toLowerCase().includes(safeQuery) || false)
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
function ComunicadosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [tipoActivo, setTipoActivo] = useState<TipoComunicado>(
    sanitizeQueryParam(searchParams.get('tipo')) as TipoComunicado || 'TODOS'
  );
  const [busqueda, setBusqueda] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 6;
  
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  const tipos: Array<{ id: TipoComunicado; label: string; icon: any }> = [
    { id: 'TODOS', label: 'Todos', icon: FileText },
    { id: 'CONVOCATORIAS', label: 'Convocatorias', icon: Calendar },
    { id: 'AVISOS', label: 'Avisos', icon: Bell },
    { id: 'COMUNICADOS', label: 'Comunicados', icon: Megaphone },
  ];

  // ==================== FETCH DATOS ====================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const institucionId = process.env.NEXT_PUBLIC_INSTITUCION_ID || 12;
        
        const [comunicadosRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/gacetaEventos`),
          api.get(`/institucionesPrincipal/${institucionId}`)
        ]);

        const comunicadosData: Comunicado[] = comunicadosRes.data.convocatorias?.filter((c: any) => c.con_estado === "1") || [];
        setComunicados(comunicadosData);
        setInstitucion(instRes.data.Descripcion);
        
        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          const colors = instRes.data.Descripcion.colorinstitucion[0];
          setPrimaryColor(getSafeColor(colors.color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(colors.color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(colors.color_terciario, '#020733'));
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error cargando comunicados:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ==================== FILTROS Y URL ====================
  useEffect(() => {
    const currentTipo = searchParams.get('tipo');
    
    if (currentTipo !== tipoActivo && tipoActivo !== 'TODOS') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tipo', sanitizeQueryParam(tipoActivo));
      router.replace(`/comunicados?${params.toString()}`, { scroll: false });
    } else if (tipoActivo === 'TODOS' && currentTipo) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tipo');
      router.replace(`/comunicados?${params.toString()}`, { scroll: false });
    }
    setPaginaActual(1);
  }, [tipoActivo, searchParams, router]);

  const comunicadosFiltrados = useMemo(() => {
    let filtrados = comunicados;
    if (tipoActivo !== 'TODOS') {
      filtrados = filtrados.filter(c => c.tipo_conv_comun?.tipo_conv_comun_titulo?.toUpperCase() === tipoActivo);
    }
    return searchComunicados(filtrados, busqueda);
  }, [comunicados, tipoActivo, busqueda]);

  const totalPaginas = Math.ceil(comunicadosFiltrados.length / itemsPorPagina);
  const safePaginaActual = Math.min(Math.max(1, paginaActual), totalPaginas);
  const inicio = (safePaginaActual - 1) * itemsPorPagina;
  const comunicadosPagina = comunicadosFiltrados.slice(inicio, inicio + itemsPorPagina);

  const cambiarPagina = (pagina: number) => {
    if (pagina < 1 || pagina > totalPaginas) return;
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTipoColor = (tipo?: string) => {
    const tipoUpper = tipo?.toUpperCase();
    const safePrimary = getSafeColor(primaryColor, '#04246C');
    const safeSecondary = getSafeColor(secondaryColor, '#FC0102');
    
    if (tipoUpper === 'CONVOCATORIAS') return { bg: `${hexToRgba(safePrimary, 0.15)}`, border: `${hexToRgba(safePrimary, 0.3)}`, text: safePrimary };
    if (tipoUpper === 'AVISOS') return { bg: `${hexToRgba('#f59e0b', 0.15)}`, border: `${hexToRgba('#f59e0b', 0.3)}`, text: '#f59e0b' };
    if (tipoUpper === 'COMUNICADOS') return { bg: `${hexToRgba(safeSecondary, 0.15)}`, border: `${hexToRgba(safeSecondary, 0.3)}`, text: safeSecondary };
    return { bg: `${hexToRgba(safePrimary, 0.1)}`, border: `${hexToRgba(safePrimary, 0.2)}`, text: safePrimary };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Por definir';
    try {
      return new Date(dateString).toLocaleDateString('es-BO', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return 'Por definir';
    }
  };

  const institucionNombre = sanitizeText(institucion?.institucion_nombre || '', 100) || 'UPEA';
  const institucionIniciales = sanitizeText(institucion?.institucion_iniciales || '', 20) || '';

  // ==================== RENDER LOADING ====================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}`, borderTopColor: primaryColor }} />
            <p className="text-gray-600">Cargando comunicados...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, #fff 0%, ${hexToRgba(primaryColor, 0.08)} 100%)` }}>
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 overflow-hidden">
         <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }} /> 
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative max-w-6xl mx-auto px-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-8 transition-colors group">
              <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
              </div>
            </Link>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <Bell className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Comunicados Institucionales
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Convocatorias, avisos y comunicados oficiales de{' '}
              <span className="font-semibold text-white">{institucionNombre}</span>
            </p>
            
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white font-medium">{comunicados.length} comunicados disponibles</span>
            </div>

            {/* Buscador Funcional */}
            <div className="relative max-w-xl">
              <div className={`relative flex items-center rounded-2xl transition-all ${searchFocused ? 'ring-2 ring-white/50' : ''}`} style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                <Search className="absolute left-4 w-5 h-5" style={{ color: primaryColor }} />
                <input
                  type="text"
                  placeholder="Buscar por título o descripción..."
                  value={busqueda}
                  onChange={(e) => { setBusqueda(sanitizeText(e.target.value, 100)); setPaginaActual(1); }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar comunicados"
                />
                {busqueda.length > 0 && (
                  <button
                    onClick={() => { setBusqueda(''); setPaginaActual(1); }}
                    className="absolute right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/80">
                  {comunicadosFiltrados.length > 0 
                    ? `${comunicadosFiltrados.length} resultado${comunicadosFiltrados.length !== 1 ? 's' : ''}` 
                    : busqueda ? 'Sin resultados' : `${comunicados.length} comunicados totales`
                  }
                </span>
                {busqueda && (
                  <span className="text-white/60">
                    Buscando: "<strong className="text-white">{busqueda}</strong>"
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section - Sticky */}
        <section className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b shadow-sm" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2 items-center overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:pb-0">
              {tipos.map((tipo) => {
                const isActive = tipoActivo === tipo.id;
                const count = tipo.id === 'TODOS' 
                  ? comunicados.length 
                  : comunicados.filter(c => c.tipo_conv_comun?.tipo_conv_comun_titulo?.toUpperCase() === tipo.id).length;
                const colors = tipo.id === 'TODOS' ? { text: primaryColor } : getTipoColor(tipo.id);
                
                return (
                  <button
                    key={tipo.id}
                    onClick={() => setTipoActivo(tipo.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all min-h-[44px] ${
                      isActive ? 'text-white shadow-md scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={isActive ? { backgroundColor: colors.text } : {}}
                  >
                    <tipo.icon className="w-4 h-4" />
                    {tipo.label}
                    <span className="px-2 py-0.5 text-xs rounded-full bg-white/20">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comunicados Grid */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {comunicadosFiltrados.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10" style={{ color: primaryColor }} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">No se encontraron comunicados</h3>
                <p className="text-gray-600 mb-8">Intenta con otros filtros o términos de búsqueda</p>
                <button
                  onClick={() => { setTipoActivo('TODOS'); setBusqueda(''); setPaginaActual(1); }}
                  className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Ver todos los comunicados
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {comunicadosPagina.map((comunicado) => {
                    const colors = getTipoColor(comunicado.tipo_conv_comun?.tipo_conv_comun_titulo);
                    const tipoLabel = comunicado.tipo_conv_comun?.tipo_conv_comun_titulo || 'COMUNICADO';
                    const tipoDisplay = tipoLabel.charAt(0) + tipoLabel.slice(1).toLowerCase();
                    
                    return (
                      <Link key={comunicado.idconvocatorias} href={`/comunicados/${comunicado.idconvocatorias}`} className="group">
                        <div className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col" style={{ borderColor: colors.border }}>
                          
                          {/* Imagen o Icono */}
                          <div className="relative h-40 overflow-hidden bg-gray-100">
                            {comunicado.con_foto_portada ? (
                              <>
                                <Image
                                  src={getStorageUrl(comunicado.con_foto_portada)}
                                  alt={sanitizeText(comunicado.con_titulo, 150)}
                                  fill
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const IconComponent = tipoLabel === 'CONVOCATORIAS' ? Calendar : tipoLabel === 'AVISOS' ? Bell : FileText;
                                      parent.innerHTML = `
                                        <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${colors.bg}, ${hexToRgba(secondaryColor, 0.1)})">
                                          <svg class="w-14 h-14 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${tipoLabel === 'CONVOCATORIAS' ? 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' : tipoLabel === 'AVISOS' ? 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' : 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'}"/>
                                          </svg>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.bg}, ${hexToRgba(secondaryColor, 0.1)})` }}>
                                {tipoLabel === 'CONVOCATORIAS' ? <Calendar className="w-14 h-14 text-white/60" /> :
                                 tipoLabel === 'AVISOS' ? <Bell className="w-14 h-14 text-white/60" /> :
                                 <FileText className="w-14 h-14 text-white/60" />}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-6 flex-1 flex flex-col">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ backgroundColor: colors.bg, color: colors.text }}>
                              {tipoDisplay}
                            </span>
                            
                            <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors text-gray-900">
                              {sanitizeText(comunicado.con_titulo, 150)}
                            </h3>
                            
                            {comunicado.con_descripcion && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: sanitizeHTML(comunicado.con_descripcion) }} />
                            )}

                            <div className="space-y-2 pt-4 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                              {(comunicado.con_fecha_inicio || comunicado.con_fecha_fin) && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar className="w-4 h-4" style={{ color: colors.text }} />
                                  <span className="text-gray-600">
                                    {comunicado.con_fecha_inicio && formatDate(comunicado.con_fecha_inicio)}
                                    {comunicado.con_fecha_fin && comunicado.con_fecha_inicio && ' - '}
                                    {comunicado.con_fecha_fin && formatDate(comunicado.con_fecha_fin)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{ borderColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                              <span className="text-sm font-semibold" style={{ color: colors.text }}>
                                Ver detalle
                              </span>
                              <ArrowLeft className="w-4 h-4 transform rotate-180 group-hover:translate-x-1 transition-transform" style={{ color: colors.text }} />
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
                      style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}` }}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="w-5 h-5" style={{ color: primaryColor }} />
                    </button>
                    
                    {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPaginas > 5) {
                        if (safePaginaActual > 3) pageNum = safePaginaActual - 2 + i;
                        if (pageNum > totalPaginas) pageNum = totalPaginas - 4 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => cambiarPagina(pageNum)}
                          className={`w-11 h-11 rounded-xl font-semibold transition-all ${
                            safePaginaActual === pageNum ? 'text-white shadow-lg scale-110' : 'border hover:bg-gray-50'
                          }`}
                          style={safePaginaActual === pageNum ? { backgroundColor: primaryColor } : { borderColor: `${hexToRgba(primaryColor, 0.3)}` }}
                          aria-current={safePaginaActual === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => cambiarPagina(safePaginaActual + 1)}
                      disabled={safePaginaActual === totalPaginas}
                      className="p-3 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                      style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}` }}
                      aria-label="Página siguiente"
                    >
                      <ChevronRight className="w-5 h-5" style={{ color: primaryColor }} />
                    </button>
                  </div>
                )}

                <p className="text-center text-sm mt-6" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>
                  Página {safePaginaActual} de {totalPaginas} - Mostrando {comunicadosPagina.length} de {comunicadosFiltrados.length} comunicados
                </p>
              </>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

export default function ComunicadosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: '#04246C' }} />
        </div>
        <Footer />
      </div>
    }>
      <ComunicadosContent />
    </Suspense>
  );
}