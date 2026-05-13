'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  FileText, Calendar, Download, Search, ArrowLeft, 
  Filter, Loader2, Eye, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import Link from 'next/link';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

interface Gaceta {
  gaceta_id: number;
  gaceta_titulo: string;
  gaceta_fecha: string;
  gaceta_documento?: string;
  gaceta_tipo?: string;
}

interface InstitucionData {
  institucion_nombre: string;
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
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isValidDocumentUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const urlToParse = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(urlToParse);
    const validProtocol = ['https:'].includes(parsed.protocol);
    const safeDomain = parsed.hostname.includes('upea.bo') || 
                      parsed.hostname.includes('localhost') ||
                      parsed.hostname.includes('127.0.0.1');
    const safePath = !parsed.pathname.includes('<') && 
                    !parsed.pathname.includes('>') &&
                    !parsed.pathname.includes('javascript:');
    return validProtocol && safeDomain && safePath;
  } catch {
    return false;
  }
};

const sanitizeTextField = (text: string | undefined, maxLength = 300): string => {
  if (!text) return '';
  return sanitizeHTML(text).replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
};

const sanitizeSearchQuery = (query: string): string => {
  return query.replace(/[<>\"'&{}]/g, '').trim().slice(0, 200);
};

const searchGacetas = (gacetas: Gaceta[], query: string): Gaceta[] => {
  if (!query.trim()) return gacetas;
  const safeQuery = sanitizeSearchQuery(query).toLowerCase();
  return gacetas.filter(g => 
    g.gaceta_titulo.toLowerCase().includes(safeQuery) ||
    (g.gaceta_tipo?.toLowerCase().includes(safeQuery) || false)
  );
};

function GacetasContent() {
  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
  const searchParams = useSearchParams();
  const router = useRouter();
 
  const rawPagina = Number(searchParams.get('pagina'));
  const paginaActual = Number.isInteger(rawPagina) && rawPagina > 0 && rawPagina < 10000 ? rawPagina : 1;
  
  const itemsPorPagina = 6;
  
  const [busqueda, setBusqueda] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [gacetas, setGacetas] = useState<Gaceta[]>([]);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);

  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [gacetaRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/gacetaEventos`),
          api.get(`/institucionesPrincipal/${institucionId}`)
        ]);

        if (!isMounted) return;

        const gacetasData = (gacetaRes.data.upea_gaceta_universitaria || [])
          .filter((g: any) => g.gaceta_id)
          .map((g: any) => ({
            gaceta_id: g.gaceta_id,
            gaceta_titulo: sanitizeTextField(g.gaceta_titulo, 200),
            gaceta_fecha: g.gaceta_fecha,
            gaceta_documento: g.gaceta_documento,
            gaceta_tipo: sanitizeTextField(g.gaceta_tipo, 50)
          })) as Gaceta[];

        setGacetas(gacetasData);
        setInstitucion(instRes.data.Descripcion || null);

        const tipos = Array.from(new Set(gacetasData.map(g => g.gaceta_tipo))).filter(Boolean);
        setTiposDisponibles(['TODOS', ...tipos as string[]]);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          const colors = instRes.data.Descripcion.colorinstitucion[0];
          setPrimaryColor(getSafeColor(colors.color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(colors.color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(colors.color_terciario, '#020733'));
        }
      } catch (err: any) {
        if (isMounted) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error cargando gacetas:', err);
          }
          setError('No se pudieron cargar las gacetas. Intente más tarde.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [institucionId]);

  const gacetasFiltradas = useMemo(() => {
    const porTipo = filtroTipo === 'TODOS' ? gacetas : gacetas.filter(g => g.gaceta_tipo === filtroTipo);
    return searchGacetas(porTipo, busqueda);
  }, [gacetas, filtroTipo, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(gacetasFiltradas.length / itemsPorPagina));
  const safePaginaActual = Math.min(Math.max(1, paginaActual), totalPaginas);
  const inicio = (safePaginaActual - 1) * itemsPorPagina;
  const fin = Math.min(inicio + itemsPorPagina, gacetasFiltradas.length);
  const gacetasPagina = gacetasFiltradas.slice(inicio, fin);

  const cambiarPagina = (nuevaPagina: number) => {
    const safePagina = Number.isInteger(nuevaPagina) && nuevaPagina > 0 && nuevaPagina <= totalPaginas ? nuevaPagina : 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set('pagina', safePagina.toString());
    router.push(`/gacetas?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (safePaginaActual > 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('pagina', '1');
      router.replace(`/gacetas?${params.toString()}`, { scroll: false });
    }
  }, [busqueda, filtroTipo]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}`, borderTopColor: primaryColor }} />
            <p className="text-gray-600">Cargando gacetas...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Error de conexión</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-shadow" style={{ backgroundColor: primaryColor }}>
              Reintentar
            </button>
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
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="font-medium">Volver al inicio</span>
            </Link>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Gaceta Universitaria
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Documentos oficiales, resoluciones y noticias de{' '}
              <span className="font-semibold text-white">{institucion?.institucion_nombre || 'nuestra universidad'}</span>
            </p>
            
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white font-medium">{gacetas.length} documentos disponibles</span>
            </div>

            {/* Buscador Funcional */}
            <div className="relative max-w-xl">
              <div className={`relative flex items-center rounded-2xl transition-all ${searchFocused ? 'ring-2 ring-white/50' : ''}`} style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                <Search className="absolute left-4 w-5 h-5" style={{ color: primaryColor }} />
                <input
                  type="text"
                  placeholder="Buscar por título o tipo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar gacetas"
                />
                {busqueda.length > 0 && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/80">
                  {gacetasFiltradas.length > 0 
                    ? `${gacetasFiltradas.length} resultado${gacetasFiltradas.length !== 1 ? 's' : ''}` 
                    : busqueda ? 'Sin resultados' : `${gacetas.length} documentos totales`
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
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-5 h-5" style={{ color: primaryColor }} />
              {tiposDisponibles.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    filtroTipo === tipo ? 'text-white shadow-md scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={filtroTipo === tipo ? { backgroundColor: primaryColor } : {}}
                >
                  {tipo === 'TODOS' ? 'Todas' : tipo}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Gacetas Grid */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {gacetasPagina.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10" style={{ color: primaryColor }} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">No se encontraron gacetas</h3>
                <p className="text-gray-600 mb-8">Intenta con otros filtros o términos de búsqueda</p>
                <button 
                  onClick={() => { setBusqueda(''); setFiltroTipo('TODOS'); }} 
                  className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
                  {gacetasPagina.map((gaceta) => (
                    <Link key={gaceta.gaceta_id} href={`/gacetas/${gaceta.gaceta_id}`} className="group">
                      <div className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                        
                        {/* Header con icono */}
                        <div className="relative h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.15)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
                          <FileText className="w-16 h-16 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm shadow-lg" style={{ color: primaryColor }}>
                            PDF
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                          {gaceta.gaceta_tipo && (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}`, color: primaryColor }}>
                              {gaceta.gaceta_tipo}
                            </span>
                          )}
                          
                          <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors text-gray-900">
                            {gaceta.gaceta_titulo}
                          </h3>
                          
                          <div className="mt-auto pt-4 border-t flex items-center justify-between" style={{ borderColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                              <span className="text-gray-600">{formatDate(gaceta.gaceta_fecha)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: primaryColor }}>
                              <span>Ver documento</span>
                              <ArrowLeft className="w-4 h-4 transform rotate-180 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-2">
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
                  Página {safePaginaActual} de {totalPaginas} - Mostrando {gacetasPagina.length} de {gacetasFiltradas.length} documentos
                </p>
              </>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4 font-serif" style={{ color: primaryColor }}>
              ¿Necesitas un documento específico?
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Contáctanos y te ayudaremos a encontrar la gaceta que necesitas
            </p>
            <Link 
              href="/contacto"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: primaryColor }}
            >
              Contactar ahora
              <ArrowLeft className="w-5 h-5 transform rotate-180" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function GacetasPage() {
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
      <GacetasContent />
    </Suspense>
  );
}