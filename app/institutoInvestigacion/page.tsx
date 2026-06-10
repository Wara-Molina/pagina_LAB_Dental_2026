'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  FlaskConical, BookOpen, Calendar, Users, Target, 
  TrendingUp, Award, FileText, ArrowLeft, Search, X,
  ChevronRight, Microscope, GraduationCap, Loader2,
  ChevronLeft, ChevronRight as ChevronRightIcon, Megaphone
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML, sanitizeText } from '@/lib/sanitize';
import {
  sanitizeQueryParam
} from '@/lib/security';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

// ==================== TIPOS ====================
interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface GacetaInvestigacion {
  gaceta_id: number;
  gaceta_titulo: string;
  gaceta_fecha: string;
  gaceta_documento?: string;
  gaceta_tipo: string;
}

interface EventoInvestigacion {
  evento_id: number;
  evento_titulo: string;
  evento_imagen?: string;
  evento_descripcion?: string;
  evento_fecha: string;
  evento_hora?: string;
  evento_lugar?: string;
  tipo_evento: string;
}

interface PublicacionInvestigacion {
  publicaciones_id: number;
  publicaciones_titulo: string;
  publicaciones_imagen?: string;
  publicaciones_descripcion?: string;
  publicaciones_documento?: string;
  publicaciones_fecha: string;
  publicaciones_autor?: string;
  publicaciones_tipo: string;
}

interface InstitucionData {
  institucion_nombre: string;
  institucion_iniciales: string;
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
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isValidResourceUrl = (url: string | undefined): boolean => {
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

const esTipoInvestigacion = (valor: any): boolean => {
  if (!valor) return false;
  const normalized = String(valor)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
  return normalized === 'INSTITUTO DE INVESTIGACION';
};

const searchItems = <T extends { gaceta_titulo?: string; evento_titulo?: string; publicaciones_titulo?: string; gaceta_descripcion?: string; evento_descripcion?: string; publicaciones_descripcion?: string }>(
  items: T[], 
  query: string,
  titleKey: keyof T,
  descKey?: keyof T
): T[] => {
  if (!query.trim()) return items;
  const safeQuery = sanitizeQueryParam(query).toLowerCase();
  return items.filter(item => {
    const title = (item[titleKey] as string)?.toLowerCase() || '';
    const desc = descKey ? (item[descKey] as string)?.toLowerCase() || '' : '';
    return title.includes(safeQuery) || desc.includes(safeQuery);
  });
};

// ==================== COMPONENTE PRINCIPAL ====================
function InstitutoInvestigacionContent() {
  const rawInstitucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID);
  const institucionId = Number.isInteger(rawInstitucionId) && rawInstitucionId > 0 && rawInstitucionId < 1000000 
    ? rawInstitucionId 
    : 12;
    
  const searchParams = useSearchParams();
  const router = useRouter();

  const [paginaProyectos, setPaginaProyectos] = useState(1);
  const [paginaPublicaciones, setPaginaPublicaciones] = useState(1);
  const [paginaEventos, setPaginaEventos] = useState(1);
  const itemsPorPagina = 6;
  
  const [busqueda, setBusqueda] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  
  const [gacetas, setGacetas] = useState<GacetaInvestigacion[]>([]);
  const [eventos, setEventos] = useState<EventoInvestigacion[]>([]);
  const [publicaciones, setPublicaciones] = useState<PublicacionInvestigacion[]>([]);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proyectos' | 'publicaciones' | 'eventos'>('proyectos');
  const [error, setError] = useState<string | null>(null);
  
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  // ==================== FETCH DATOS ====================
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [gacetaEventosRes, recursosRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/gacetaEventos`),
          api.get(`/institucion/${institucionId}/recursos`),
          api.get(`/institucionesPrincipal/${institucionId}`)
        ]);

        if (!isMounted) return;

        // ✅ Gacetas: filtrar ESTRICTAMENTE
        const gacetasData = (gacetaEventosRes.data.upea_gaceta_universitaria || [])
          .filter((g: any) => esTipoInvestigacion(g.gaceta_tipo))
          .map((g: any) => ({
            gaceta_id: g.gaceta_id,
            gaceta_titulo: sanitizeText(g.gaceta_titulo, 200),
            gaceta_fecha: g.gaceta_fecha,
            gaceta_documento: isValidResourceUrl(g.gaceta_documento) ? g.gaceta_documento : undefined,
            gaceta_tipo: sanitizeText(g.gaceta_tipo, 50)
          })) as GacetaInvestigacion[];
        
        // ✅ Eventos: filtrar ESTRICTAMENTE
        const eventosData = (gacetaEventosRes.data.upea_evento || [])
          .filter((e: any) => esTipoInvestigacion(e.tipo_evento))
          .map((e: any) => ({
            evento_id: e.evento_id,
            evento_titulo: sanitizeText(e.evento_titulo, 200),
            evento_imagen: isValidResourceUrl(e.evento_imagen) ? e.evento_imagen : undefined,
            evento_descripcion: sanitizeHTML(e.evento_descripcion || ''),
            evento_fecha: e.evento_fecha,
            evento_hora: e.evento_hora?.substring(0, 5) || '',
            evento_lugar: sanitizeText(e.evento_lugar, 100),
            tipo_evento: sanitizeText(e.tipo_evento, 50)
          })) as EventoInvestigacion[];
        
        // ✅ Publicaciones: filtrar ESTRICTAMENTE
        const publicacionesData = (recursosRes.data.upea_publicaciones || [])
          .filter((p: any) => esTipoInvestigacion(p.publicaciones_tipo))
          .map((p: any) => ({
            publicaciones_id: p.publicaciones_id,
            publicaciones_titulo: sanitizeText(p.publicaciones_titulo, 200),
            publicaciones_imagen: isValidResourceUrl(p.publicaciones_imagen) ? p.publicaciones_imagen : undefined,
            publicaciones_descripcion: sanitizeHTML(p.publicaciones_descripcion || ''),
            publicaciones_documento: isValidResourceUrl(p.publicaciones_documento) ? p.publicaciones_documento : undefined,
            publicaciones_fecha: p.publicaciones_fecha,
            publicaciones_autor: sanitizeText(p.publicaciones_autor, 100),
            publicaciones_tipo: sanitizeText(p.publicaciones_tipo, 50)
          })) as PublicacionInvestigacion[];

        setGacetas(gacetasData);
        setEventos(eventosData);
        setPublicaciones(publicacionesData);
        setInstitucion(instRes.data.Descripcion || null);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          const colors = instRes.data.Descripcion.colorinstitucion[0];
          setPrimaryColor(getSafeColor(colors.color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(colors.color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(colors.color_terciario, '#020733'));
        }
      } catch (err: any) {
        if (isMounted) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error cargando datos del instituto:', err);
          }
          setError('No se pudieron cargar los datos del instituto. Intente más tarde.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [institucionId]);

  // Reset pagination on tab change
  useEffect(() => {
    setPaginaProyectos(1);
    setPaginaPublicaciones(1);
    setPaginaEventos(1);
  }, [activeTab]);

  // Reset pagination on search change
  useEffect(() => {
    setPaginaProyectos(1);
    setPaginaPublicaciones(1);
    setPaginaEventos(1);
  }, [busqueda]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-BO', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // Filtered & searched items with useMemo
  const gacetasFiltradas = useMemo(() => {
    return searchItems(gacetas, busqueda, 'gaceta_titulo');
  }, [gacetas, busqueda]);

  const publicacionesFiltradas = useMemo(() => {
    return searchItems(publicaciones, busqueda, 'publicaciones_titulo', 'publicaciones_descripcion');
  }, [publicaciones, busqueda]);

  const eventosFiltrados = useMemo(() => {
    return searchItems(eventos, busqueda, 'evento_titulo', 'evento_descripcion');
  }, [eventos, busqueda]);

  // Pagination calculations
  const totalPaginasProyectos = Math.max(1, Math.ceil(gacetasFiltradas.length / itemsPorPagina));
  const totalPaginasPublicaciones = Math.max(1, Math.ceil(publicacionesFiltradas.length / itemsPorPagina));
  const totalPaginasEventos = Math.max(1, Math.ceil(eventosFiltrados.length / itemsPorPagina));

  const gacetasPagina = useMemo(() => 
    gacetasFiltradas.slice((paginaProyectos - 1) * itemsPorPagina, paginaProyectos * itemsPorPagina),
    [gacetasFiltradas, paginaProyectos]
  );
  
  const publicacionesPagina = useMemo(() => 
    publicacionesFiltradas.slice((paginaPublicaciones - 1) * itemsPorPagina, paginaPublicaciones * itemsPorPagina),
    [publicacionesFiltradas, paginaPublicaciones]
  );
  
  const eventosPagina = useMemo(() => 
    eventosFiltrados.slice((paginaEventos - 1) * itemsPorPagina, paginaEventos * itemsPorPagina),
    [eventosFiltrados, paginaEventos]
  );

  const cambiarPagina = (setter: React.Dispatch<React.SetStateAction<number>>, nuevaPagina: number, totalPaginas: number) => {
    const safePagina = Number.isInteger(nuevaPagina) && nuevaPagina > 0 && nuevaPagina <= totalPaginas 
      ? nuevaPagina 
      : 1;
    setter(safePagina);
  };

  const renderPagination = (paginaActual: number, totalPaginas: number, onPageChange: (page: number) => void, color: string) => {
    if (totalPaginas <= 1) return null;
    
    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => onPageChange(paginaActual - 1)}
          disabled={paginaActual === 1}
          className="p-3 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
          style={{ borderColor: `${hexToRgba(color, 0.3)}` }}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-5 h-5" style={{ color }} />
        </button>
        
        {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
          let pageNum = i + 1;
          if (totalPaginas > 5) {
            if (paginaActual > 3) pageNum = paginaActual - 2 + i;
            if (pageNum > totalPaginas) pageNum = totalPaginas - 4 + i;
          }
          
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-11 h-11 rounded-xl font-semibold transition-all ${
                paginaActual === pageNum ? 'text-white shadow-lg scale-110' : 'border hover:bg-gray-50'
              }`}
              style={paginaActual === pageNum ? { backgroundColor: color } : { borderColor: `${hexToRgba(color, 0.3)}` }}
              aria-current={paginaActual === pageNum ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}
        
        <button
          onClick={() => onPageChange(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          className="p-3 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
          style={{ borderColor: `${hexToRgba(color, 0.3)}` }}
          aria-label="Página siguiente"
        >
          <ChevronRightIcon className="w-5 h-5" style={{ color }} />
        </button>
      </div>
    );
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
            <p className="text-gray-600">Cargando instituto de investigación...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ==================== RENDER ERROR ====================
  if (error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">⚠️</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Error de conexión</h2>
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
                <FlaskConical className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Instituto de Investigación
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              {institucionNombre} - Generando conocimiento científico e innovación
            </p>
            
            {/* Stats Badges */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                <FlaskConical className="w-4 h-4 text-white" />
                <span className="text-sm text-white font-medium">{gacetas.length} proyectos</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                <BookOpen className="w-4 h-4 text-white" />
                <span className="text-sm text-white font-medium">{publicaciones.length} publicaciones</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                <Calendar className="w-4 h-4 text-white" />
                <span className="text-sm text-white font-medium">{eventos.length} eventos</span>
              </div>
            </div>

            {/* Buscador Global */}
            <div className="relative max-w-xl">
              <div className={`relative flex items-center rounded-2xl transition-all ${searchFocused ? 'ring-2 ring-white/50' : ''}`} style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                <Search className="absolute left-4 w-5 h-5" style={{ color: primaryColor }} />
                <input
                  type="text"
                  placeholder="Buscar proyectos, publicaciones o eventos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(sanitizeText(e.target.value, 100))}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar en el instituto"
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
                  {busqueda 
                    ? `${gacetasFiltradas.length + publicacionesFiltradas.length + eventosFiltrados.length} resultados` 
                    : `${gacetas.length + publicaciones.length + eventos.length} ítems totales`
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

        {/* Stats Cards */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border shadow-lg p-6 text-center hover:shadow-xl transition-shadow" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                <FlaskConical className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
                <p className="text-3xl font-bold" style={{ color: primaryColor }}>{gacetas.length}</p>
                <p className="text-sm text-gray-600">Proyectos</p>
              </div>
              <div className="bg-white rounded-2xl border shadow-lg p-6 text-center hover:shadow-xl transition-shadow" style={{ borderColor: `${hexToRgba(secondaryColor, 0.2)}` }}>
                <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: secondaryColor }} />
                <p className="text-3xl font-bold" style={{ color: secondaryColor }}>{publicaciones.length}</p>
                <p className="text-sm text-gray-600">Publicaciones</p>
              </div>
              <div className="bg-white rounded-2xl border shadow-lg p-6 text-center hover:shadow-xl transition-shadow" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
                <p className="text-3xl font-bold" style={{ color: primaryColor }}>{eventos.length}</p>
                <p className="text-sm text-gray-600">Eventos</p>
              </div>
              <div className="bg-white rounded-2xl border shadow-lg p-6 text-center hover:shadow-xl transition-shadow" style={{ borderColor: `${hexToRgba(tertiaryColor, 0.2)}` }}>
                <Award className="w-8 h-8 mx-auto mb-3" style={{ color: tertiaryColor }} />
                <p className="text-3xl font-bold" style={{ color: tertiaryColor }}>15+</p>
                <p className="text-sm text-gray-600">Líneas de Investigación</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs Navigation - Sticky */}
        <section className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b shadow-sm" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-wrap gap-2 py-4">
              {[
                { id: 'proyectos' as const, label: 'Proyectos', icon: FlaskConical },
                { id: 'publicaciones' as const, label: 'Publicaciones', icon: BookOpen },
                { id: 'eventos' as const, label: 'Eventos', icon: Calendar },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm transition-all ${
                    activeTab === tab.id ? 'text-white shadow-md scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: primaryColor } : {}}
                  aria-pressed={activeTab === tab.id}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content Area */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* PROYECTOS TAB */}
            {activeTab === 'proyectos' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2 text-gray-900 font-serif" style={{ color: primaryColor }}>Proyectos de Investigación</h2>
                  <p className="text-gray-600">Conoce los proyectos de investigación que estamos desarrollando</p>
                </div>

                {gacetasFiltradas.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">No hay proyectos registrados</h3>
                    <p className="text-gray-600 mb-8">Próximamente se publicarán nuevos proyectos de investigación</p>
                    {busqueda && (
                      <button 
                        onClick={() => setBusqueda('')}
                        className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gacetasPagina.map((gaceta) => (
                        <Link key={gaceta.gaceta_id} href={`/institutoInvestigacion/gacetas/${gaceta.gaceta_id}`} className="group">
                          <div className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                            <div className="p-6 flex-1 flex flex-col">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                                <FileText className="w-6 h-6" style={{ color: primaryColor }} />
                              </div>
                              <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors text-gray-900">
                                {gaceta.gaceta_titulo}
                              </h3>
                              <div className="flex items-center gap-2 text-xs mt-auto pt-4 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                                <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                                <span className="text-gray-600">{formatDate(gaceta.gaceta_fecha)}</span>
                              </div>
                            </div>
                            <div className="px-6 pb-6">
                              <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: primaryColor }}>
                                Ver proyecto <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {renderPagination(paginaProyectos, totalPaginasProyectos, (page) => cambiarPagina(setPaginaProyectos, page, totalPaginasProyectos), primaryColor)}
                    <p className="text-center text-sm mt-6" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>
                      Página {paginaProyectos} de {totalPaginasProyectos} - Mostrando {gacetasPagina.length} de {gacetasFiltradas.length} proyectos
                    </p>
                  </>
                )}
              </div>
            )}

            {/* PUBLICACIONES TAB */}
            {activeTab === 'publicaciones' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2 text-gray-900 font-serif" style={{ color: primaryColor }}>Publicaciones Científicas</h2>
                  <p className="text-gray-600">Artículos, papers y documentos académicos producidos por el instituto</p>
                </div>

                {publicacionesFiltradas.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="w-10 h-10" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">No hay publicaciones disponibles</h3>
                    <p className="text-gray-600 mb-8">Las publicaciones del instituto aparecerán aquí</p>
                    {busqueda && (
                      <button 
                        onClick={() => setBusqueda('')}
                        className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {publicacionesPagina.map((publi) => (
                        <Link key={publi.publicaciones_id} href={`/institutoInvestigacion/publicaciones/${publi.publicaciones_id}`} className="group">
                          <div className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                            {publi.publicaciones_imagen ? (
                              <div className="relative h-40 overflow-hidden bg-gray-100">
                                <Image
                                  src={getStorageUrl(publi.publicaciones_imagen)}
                                  alt={publi.publicaciones_titulo}
                                  fill
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${hexToRgba(primaryColor, 0.3)}, ${hexToRgba(secondaryColor, 0.2)})">
                                          <svg class="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                          </svg>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="relative h-40 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.3)}, ${hexToRgba(secondaryColor, 0.2)})` }}>
                                <BookOpen className="w-16 h-16 text-white/60" />
                              </div>
                            )}
                            <div className="p-6 flex-1 flex flex-col">
                              <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors text-gray-900">
                                {publi.publicaciones_titulo}
                              </h3>
                              {publi.publicaciones_autor && (
                                <div className="flex items-center gap-2 text-xs mb-3">
                                  <Users className="w-4 h-4" style={{ color: primaryColor }} />
                                  <span className="text-gray-600">{publi.publicaciones_autor}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs mt-auto pt-4 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                                <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                                <span className="text-gray-600">{formatDate(publi.publicaciones_fecha)}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {renderPagination(paginaPublicaciones, totalPaginasPublicaciones, (page) => cambiarPagina(setPaginaPublicaciones, page, totalPaginasPublicaciones), primaryColor)}
                    <p className="text-center text-sm mt-6" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>
                      Página {paginaPublicaciones} de {totalPaginasPublicaciones} - Mostrando {publicacionesPagina.length} de {publicacionesFiltradas.length} publicaciones
                    </p>
                  </>
                )}
              </div>
            )}

            {/* EVENTOS TAB */}
            {activeTab === 'eventos' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2 text-gray-900 font-serif" style={{ color: primaryColor }}>Eventos de Investigación</h2>
                  <p className="text-gray-600">Congresos, seminarios, talleres y actividades académicas</p>
                </div>

                {eventosFiltrados.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                      <Calendar className="w-10 h-10" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">No hay eventos programados</h3>
                    <p className="text-gray-600 mb-8">Próximamente se anunciarán nuevos eventos de investigación</p>
                    {busqueda && (
                      <button 
                        onClick={() => setBusqueda('')}
                        className="px-8 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {eventosPagina.map((evento) => (
                        <Link key={evento.evento_id} href={`/institutoInvestigacion/eventos/${evento.evento_id}`} className="group">
                          <div className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                            <div className="flex flex-col md:flex-row">
                              {evento.evento_imagen && (
                                <div className="relative w-full md:w-72 h-48 md:h-auto overflow-hidden">
                                  <Image
                                    src={getStorageUrl(evento.evento_imagen)}
                                    alt={evento.evento_titulo}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 288px"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="flex-1 p-6">
                                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors text-gray-900">
                                  {evento.evento_titulo}
                                </h3>
                                {evento.evento_descripcion && (
                                  <p className="text-gray-600 text-sm mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: sanitizeHTML(evento.evento_descripcion) }} />
                                )}
                                <div className="flex flex-wrap gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                                    <span className="text-gray-600">{formatDate(evento.evento_fecha)}</span>
                                  </div>
                                  {evento.evento_hora && (
                                    <div className="flex items-center gap-2">
                                      <Target className="w-4 h-4" style={{ color: primaryColor }} />
                                      <span className="text-gray-600">{evento.evento_hora}</span>
                                    </div>
                                  )}
                                  {evento.evento_lugar && (
                                    <div className="flex items-center gap-2">
                                      <GraduationCap className="w-4 h-4" style={{ color: primaryColor }} />
                                      <span className="text-gray-600 truncate max-w-[150px]">{evento.evento_lugar}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {renderPagination(paginaEventos, totalPaginasEventos, (page) => cambiarPagina(setPaginaEventos, page, totalPaginasEventos), primaryColor)}
                    <p className="text-center text-sm mt-6" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>
                      Página {paginaEventos} de {totalPaginasEventos} - Mostrando {eventosPagina.length} de {eventosFiltrados.length} eventos
                    </p>
                  </>
                )}
              </div>
            )}

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

export default function InstitutoInvestigacionPage() {
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
      <InstitutoInvestigacionContent />
    </Suspense>
  );
}