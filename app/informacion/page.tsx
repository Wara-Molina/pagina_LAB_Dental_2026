'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Target, Eye, Award, Users, BookOpen, TrendingUp,
  User, Mail, Phone, Facebook, Linkedin, Calendar, MapPin, 
  Clock, Navigation, ArrowLeft, ChevronRight, Globe
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

// ==================== TIPOS ====================
interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

interface InstitucionData {
  institucion_id: number;
  institucion_nombre: string;
  institucion_iniciales: string;
  institucion_mision?: string;
  institucion_vision?: string;
  institucion_historia?: string;
  institucion_objetivos?: string;
  institucion_direccion?: string;
  institucion_correo1?: string;
  institucion_celular1?: number;
  institucion_celular2?: number;
  institucion_api_google_map?: string;
  colorinstitucion: ColorInstitucion[];
}

interface Autoridad {
  id_autoridad: number;
  foto_autoridad?: string;
  nombre_autoridad: string;
  cargo_autoridad: string;
  facebook_autoridad?: string;
  celular_autoridad?: string;
  twiter_autoridad?: string;
}

interface UbicacionData {
  ubicacion_imagen?: string;
  ubicacion_titulo?: string;
  ubicacion_descripcion?: string;
  ubicacion_latitud?: string;
  ubicacion_longitud?: string;
}

type SeccionInfo = 'mision-vision' | 'autoridades' | 'historia' | 'ubicacion';

const SECCIONES_VALIDAS: SeccionInfo[] = ['mision-vision', 'autoridades', 'historia', 'ubicacion'];

const isValidSeccion = (seccion: string | null): seccion is SeccionInfo => {
  return seccion !== null && (SECCIONES_VALIDAS as string[]).includes(seccion);
};

const isValidExternalUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const validProtocol = ['https:'].includes(parsed.protocol);
    const safeDomains = [
      'facebook.com', 'www.facebook.com',
      'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
      'linkedin.com', 'www.linkedin.com',
      'maps.google.com', 'www.google.com', 'google.com',
      'upea.bo', 'localhost', '127.0.0.1'
    ];
    const safeDomain = safeDomains.some(domain => parsed.hostname.includes(domain));
    const safePath = !parsed.pathname.includes('<') && !parsed.pathname.includes('>') && !parsed.pathname.includes('javascript:');
    return validProtocol && safeDomain && safePath;
  } catch {
    return false;
  }
};

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

const sanitizeTextField = (text: string | undefined, maxLength = 1000): string => {
  if (!text) return '';
  return sanitizeHTML(text).trim().slice(0, maxLength);
};

// ==================== COMPONENTE PRINCIPAL ====================
function InformacionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialSeccion = useMemo(() => {
    const raw = searchParams.get('section');
    return isValidSeccion(raw) ? raw : 'mision-vision';
  }, []); 
  
  const [seccionActiva, setSeccionActiva] = useState<SeccionInfo>(initialSeccion);
  
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [autoridades, setAutoridades] = useState<Autoridad[]>([]);
  const [ubicacion, setUbicacion] = useState<UbicacionData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  const secciones: Array<{ id: SeccionInfo; label: string; icon: any; description: string }> = [
    { id: 'mision-vision', label: 'Misión y Visión', icon: Target, description: 'Nuestro propósito y proyección' },
    { id: 'autoridades', label: 'Autoridades', icon: Users, description: 'Equipo directivo' },
    { id: 'historia', label: 'Historia', icon: BookOpen, description: 'Nuestra trayectoria' },
    { id: 'ubicacion', label: 'Ubicación', icon: MapPin, description: 'Cómo encontrarnos' },
  ];

  // ==================== FETCH DATOS ====================
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
        
        const [instRes, contenidoRes] = await Promise.all([
          api.get(`/institucionesPrincipal/${institucionId}`),
          api.get(`/institucion/${institucionId}/contenido`)
        ]);

        if (!isMounted) return;

        const instData = instRes.data.Descripcion;
        
        setInstitucion({
          ...instData,
          institucion_mision: sanitizeTextField(instData.institucion_mision),
          institucion_vision: sanitizeTextField(instData.institucion_vision),
          institucion_historia: sanitizeTextField(instData.institucion_historia),
          institucion_objetivos: sanitizeTextField(instData.institucion_objetivos),
          institucion_direccion: sanitizeTextField(instData.institucion_direccion, 300),
          institucion_correo1: instData.institucion_correo1?.replace(/[<>\"'&]/g, ''),
        });
        
        const autoridadesSanitizadas = (contenidoRes.data.autoridad || []).map((a: any) => ({
          ...a,
          nombre_autoridad: sanitizeTextField(a.nombre_autoridad, 100),
          cargo_autoridad: sanitizeTextField(a.cargo_autoridad, 100),
          facebook_autoridad: isValidExternalUrl(a.facebook_autoridad) ? a.facebook_autoridad : undefined,
          twiter_autoridad: isValidExternalUrl(a.twiter_autoridad) ? a.twiter_autoridad : undefined,
        }));
        setAutoridades(autoridadesSanitizadas);
        
        const ubicacionData = contenidoRes.data.ubicacion?.[0];
        setUbicacion(ubicacionData ? {
          ...ubicacionData,
          ubicacion_titulo: sanitizeTextField(ubicacionData.ubicacion_titulo, 100),
          ubicacion_descripcion: sanitizeTextField(ubicacionData.ubicacion_descripcion),
          ubicacion_latitud: ubicacionData.ubicacion_latitud?.replace(/[<>\"'&]/g, ''),
          ubicacion_longitud: ubicacionData.ubicacion_longitud?.replace(/[<>\"'&]/g, ''),
        } : null);
        
        if (instData.colorinstitucion?.[0]) {
          const colors = instData.colorinstitucion[0];
          setPrimaryColor(getSafeColor(colors.color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(colors.color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(colors.color_terciario, '#020733'));
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error cargando datos:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    
    return () => { isMounted = false; };
  }, []); 

  useEffect(() => {
    const currentSection = searchParams.get('section');
    if (currentSection !== seccionActiva) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', seccionActiva);
      router.replace(`/informacion?${params.toString()}`, { scroll: false });
    }
  }, [seccionActiva, router]);

  // ==================== RENDER LOADING ====================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}`, borderTopColor: primaryColor }} />
            <p className="text-gray-600">Cargando información...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ==================== RENDER SECCIONES ====================
  const renderSeccion = () => {
    switch (seccionActiva) {
      case 'mision-vision':
        return <SeccionMisionVision institucion={institucion} primaryColor={primaryColor} secondaryColor={secondaryColor} tertiaryColor={tertiaryColor} />;
      case 'autoridades':
        return <SeccionAutoridades autoridades={autoridades} primaryColor={primaryColor} secondaryColor={secondaryColor} />;
      case 'historia':
        return <SeccionHistoria institucion={institucion} primaryColor={primaryColor} secondaryColor={secondaryColor} tertiaryColor={tertiaryColor} />;
      case 'ubicacion':
        return <SeccionUbicacion institucion={institucion} ubicacion={ubicacion} primaryColor={primaryColor} secondaryColor={secondaryColor} tertiaryColor={tertiaryColor} />;
      default:
        return <SeccionMisionVision institucion={institucion} primaryColor={primaryColor} secondaryColor={secondaryColor} tertiaryColor={tertiaryColor} />;
    }
  };

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
                <Target className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Información Institucional
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Conoce nuestra misión, visión, historia, autoridades y ubicación de{' '}
              <span className="font-semibold text-white">{institucion?.institucion_nombre || 'nuestra institución'}</span>
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
              {secciones.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSeccionActiva(sec.id)}
                  className={`text-left p-4 rounded-xl backdrop-blur-sm border transition-all ${
                    seccionActiva === sec.id 
                      ? 'bg-white/20 border-white/40' 
                      : 'bg-white/10 border-white/20 hover:bg-white/15'
                  }`}
                >
                  <sec.icon className="w-5 h-5 text-white mb-2" />
                  <p className="text-white font-medium text-sm">{sec.label}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sticky Tab Navigation */}
        <section className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b shadow-sm" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
          <div className="max-w-6xl mx-auto px-4">
            <nav className="flex flex-wrap gap-2 py-4" role="tablist" aria-label="Secciones de información">
              {secciones.map((seccion) => {
                const isActive = seccionActiva === seccion.id;
                return (
                  <button
                    key={seccion.id}
                    onClick={() => setSeccionActiva(seccion.id)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-full font-medium text-sm transition-all ${
                      isActive ? 'text-white shadow-md scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : {}}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${seccion.id}`}
                  >
                    <seccion.icon className="w-4 h-4" aria-hidden="true" />
                    {seccion.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </section>

        {/* Content Area */}
        <section className="py-12 lg:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderSeccion()}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

// ==================== SECCIÓN: MISIÓN Y VISIÓN ====================
function SeccionMisionVision({ institucion, primaryColor, secondaryColor, tertiaryColor }: {
  institucion: InstitucionData | null;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
}) {
  return (
    <div className="space-y-10">
      {/* Mission & Vision Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Mission */}
        <div className="group bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-2xl transition-all duration-300" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
          <div className="p-1" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.3)}, ${hexToRgba(primaryColor, 0.1)})` }}>
            <div className="bg-white rounded-xl p-8 h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                  <Target className="w-7 h-7" style={{ color: primaryColor }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>Misión</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(institucion?.institucion_mision || '<p>Formar profesionales competentes con enfoque holístico.</p>') }} />
            </div>
          </div>
        </div>

        {/* Vision */}
        <div className="group bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-2xl transition-all duration-300" style={{ borderColor: `${hexToRgba(secondaryColor, 0.2)}` }}>
          <div className="p-1" style={{ background: `linear-gradient(135deg, ${hexToRgba(secondaryColor, 0.3)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
            <div className="bg-white rounded-xl p-8 h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${hexToRgba(secondaryColor, 0.15)}` }}>
                  <Eye className="w-7 h-7" style={{ color: secondaryColor }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: secondaryColor }}>Visión</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(institucion?.institucion_vision || '<p>Ser referentes en educación superior.</p>') }} />
            </div>
          </div>
        </div>
      </div>

      {/* Objetivos */}
      {institucion?.institucion_objetivos && (
        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
          <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(primaryColor, 0.2)}, transparent)` }}>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                  <Award className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>Objetivos Institucionales</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(institucion.institucion_objetivos) }} />
            </div>
          </div>
        </div>
      )}

      {/* Values Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {[
          { icon: Users, title: 'Compromiso', desc: 'Dedicación total a la excelencia educativa', color: primaryColor },
          { icon: BookOpen, title: 'Calidad', desc: 'Estándares académicos de excelencia', color: secondaryColor },
          { icon: Target, title: 'Innovación', desc: 'Metodologías educativas modernas', color: tertiaryColor },
          { icon: TrendingUp, title: 'Crecimiento', desc: 'Desarrollo continuo y mejora', color: primaryColor },
        ].map((item, idx) => (
          <div key={idx} className="text-center p-6 rounded-2xl bg-white border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group" style={{ borderColor: `${hexToRgba(item.color, 0.2)}` }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: `${hexToRgba(item.color, 0.15)}` }}>
              <item.icon className="w-7 h-7" style={{ color: item.color }} />
            </div>
            <h3 className="font-bold mb-2 text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SECCIÓN: AUTORIDADES ====================
function SeccionAutoridades({ autoridades, primaryColor, secondaryColor }: {
  autoridades: Autoridad[];
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <div>
      {autoridades.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {autoridades.map((autoridad) => (
            <div key={autoridad.id_autoridad} className="group bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
              {/* Foto */}
              <div className="relative h-64 overflow-hidden bg-gray-100">
                {autoridad.foto_autoridad ? (
                  <>
                    <Image
                      src={getStorageUrl(autoridad.foto_autoridad)}
                      alt={autoridad.nombre_autoridad}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${hexToRgba(primaryColor, 0.4)}, ${hexToRgba(secondaryColor, 0.3)})">
                              <svg class="w-20 h-20 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.3)}, ${hexToRgba(secondaryColor, 0.2)})` }}>
                    <User className="w-20 h-20 text-white/60" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{autoridad.nombre_autoridad}</h3>
                <p className="text-sm font-medium mb-4" style={{ color: primaryColor }}>
                  {autoridad.cargo_autoridad}
                </p>
                
                <div className="space-y-3 pt-4 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                  {autoridad.celular_autoridad && (
                    <a href={`tel:${autoridad.celular_autoridad}`} className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors">
                      <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                      <span>{autoridad.celular_autoridad}</span>
                    </a>
                  )}
                  {(autoridad.facebook_autoridad || autoridad.twiter_autoridad) && (
                    <div className="flex gap-2 pt-2">
                      {autoridad.facebook_autoridad && isValidExternalUrl(autoridad.facebook_autoridad) && (
                        <a href={autoridad.facebook_autoridad} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-gray-100 hover:bg-blue-50 transition-colors" style={{ color: '#1877F2' }} aria-label={`Facebook de ${autoridad.nombre_autoridad}`}>
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {autoridad.twiter_autoridad && isValidExternalUrl(autoridad.twiter_autoridad) && (
                        <a href={autoridad.twiter_autoridad} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-gray-100 hover:bg-blue-50 transition-colors" style={{ color: '#0088cc' }} aria-label={`Twitter de ${autoridad.nombre_autoridad}`}>
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10" style={{ color: primaryColor }} />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gray-900">No hay autoridades registradas</h3>
          <p className="text-gray-600 mb-8">La información de autoridades estará disponible próximamente</p>
          <Link href="/contacto" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
            Contactar administración
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ==================== SECCIÓN: HISTORIA ====================
function SeccionHistoria({ institucion, primaryColor, secondaryColor, tertiaryColor }: {
  institucion: InstitucionData | null;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
}) {
  return (
    <div className="space-y-12">
      {/* Historia Card */}
      <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
        <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(primaryColor, 0.2)}, transparent)` }}>
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
                {institucion?.institucion_nombre} - {institucion?.institucion_iniciales}
              </h2>
            </div>
            {institucion?.institucion_historia ? (
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(institucion.institucion_historia) }} />
            ) : (
              <>
                <p className="text-gray-700 leading-relaxed mb-4">Somos una institución comprometida con la excelencia académica.</p>
                <p className="text-gray-700 leading-relaxed">Nuestra trayectoria se caracteriza por la innovación pedagógica.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Objetivos o Valores */}
      {institucion?.institucion_objetivos ? (
        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(secondaryColor, 0.2)}` }}>
          <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(secondaryColor, 0.2)}, transparent)` }}>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hexToRgba(secondaryColor, 0.15)}` }}>
                  <Target className="w-6 h-6" style={{ color: secondaryColor }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: secondaryColor }}>Objetivos Estratégicos</h2>
              </div>
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(institucion.institucion_objetivos) }} />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-3xl font-bold text-center mb-10 font-serif" style={{ color: primaryColor }}>Valores Institucionales</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: 'Compromiso Social', desc: 'Servicio a la comunidad', color: primaryColor },
              { icon: BookOpen, title: 'Excelencia Académica', desc: 'Formación de calidad', color: secondaryColor },
              { icon: TrendingUp, title: 'Innovación', desc: 'Nuevas tecnologías', color: tertiaryColor },
              { icon: Award, title: 'Integridad', desc: 'Transparencia', color: primaryColor },
            ].map((valor, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-center group" style={{ borderColor: `${hexToRgba(valor.color, 0.2)}` }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: `${hexToRgba(valor.color, 0.15)}` }}>
                  <valor.icon className="w-7 h-7" style={{ color: valor.color }} />
                </div>
                <h3 className="font-bold mb-2 text-gray-900">{valor.title}</h3>
                <p className="text-sm text-gray-600">{valor.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SECCIÓN: UBICACIÓN ====================
function SeccionUbicacion({ institucion, ubicacion, primaryColor, secondaryColor, tertiaryColor }: {
  institucion: InstitucionData | null;
  ubicacion: UbicacionData | null;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
}) {
  const safeMapUrl = useMemo(() => {
    if (!institucion?.institucion_api_google_map) return '';
    return isValidExternalUrl(institucion.institucion_api_google_map) ? institucion.institucion_api_google_map : '';
  }, [institucion?.institucion_api_google_map]);

  const safeCoords = useMemo(() => {
    const lat = ubicacion?.ubicacion_latitud?.replace(/[^0-9.\-]/g, '') || '-16.489549430458553';
    const lng = ubicacion?.ubicacion_longitud?.replace(/[^0-9.\-]/g, '') || '-68.19329917301572';
    return { lat, lng };
  }, [ubicacion?.ubicacion_latitud, ubicacion?.ubicacion_longitud]);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Contact Info */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
          <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(primaryColor, 0.2)}, transparent)` }}>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                  <MapPin className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>Información de Contacto</h2>
              </div>
              
              <div className="space-y-5">
                {/* Dirección */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                    <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-gray-900">Dirección</h3>
                    <p className="text-gray-600">{institucion?.institucion_direccion || 'Av. Sucre Z. Villa Esperanza, Campus UPEA Bloque B Piso 3'}</p>
                  </div>
                </div>

                {/* Teléfonos */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(secondaryColor, 0.15)}` }}>
                    <Phone className="w-5 h-5" style={{ color: secondaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-gray-900">Teléfonos</h3>
                    <p className="text-gray-600">
                      {institucion?.institucion_celular1 && `${institucion.institucion_celular1}`}
                      {institucion?.institucion_celular2 && ` / ${institucion.institucion_celular2}`}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                    <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-gray-900">Correo Electrónico</h3>
                    <a href={`mailto:${institucion?.institucion_correo1}`} className="text-gray-600 hover:underline" style={{ color: primaryColor }}>
                      {institucion?.institucion_correo1 || 'info@institucion.edu.bo'}
                    </a>
                  </div>
                </div>

                {/* Horario */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(tertiaryColor, 0.15)}` }}>
                    <Clock className="w-5 h-5" style={{ color: tertiaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-gray-900">Horario de Atención</h3>
                    <p className="text-gray-600">Lunes a Viernes: 8:00 - 12:00 y 14:00 - 18:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {ubicacion?.ubicacion_descripcion && (
          <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(secondaryColor, 0.2)}` }}>
            <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(secondaryColor, 0.2)}, transparent)` }}>
              <div className="p-8">
                <h3 className="text-xl font-bold mb-4" style={{ color: secondaryColor }}>
                  {ubicacion.ubicacion_titulo || 'Información Adicional'}
                </h3>
                <p className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(ubicacion.ubicacion_descripcion) }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
        {safeMapUrl ? (
          <iframe
            src={safeMapUrl}
            width="100%"
            height="500"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="w-full"
            title="Ubicación en Google Maps"
          />
        ) : (
          <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Navigation className="w-16 h-16 mx-auto mb-4" style={{ color: primaryColor }} />
              <p className="text-gray-600">Mapa no disponible</p>
            </div>
          </div>
        )}
      </div>

      {/* CTA: Get Directions */}
      <div className="lg:col-span-2 text-center pt-4">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${safeCoords.lat},${safeCoords.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          style={{ backgroundColor: primaryColor }}
        >
          <Navigation className="w-5 h-5" />
          Cómo llegar con Google Maps
          <Globe className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}

// ==================== WRAPPER ====================
export default function InformacionPage() {
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
      <InformacionContent />
    </Suspense>
  );
}