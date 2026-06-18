'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar, MapPin, Clock, Share2, 
  Maximize2, X, ZoomIn, Loader2, ExternalLink, Mail
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

interface Evento {
  evento_id: number;
  evento_titulo: string;
  evento_imagen?: string;
  evento_descripcion?: string;
  evento_fecha: string;
  evento_hora?: string;
  evento_lugar?: string;
  tipo_evento: string;
}

interface InstitucionData {
  institucion_nombre: string;
  institucion_correo1?: string;
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

const isValidImageUrl = (url: string | undefined): boolean => {
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

const sanitizeTextField = (text: string | undefined, maxLength = 500): string => {
  if (!text) return '';
  return sanitizeHTML(text).replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
};

const sanitizeForShare = (text: string | undefined): string => {
  if (!text) return '';
  return sanitizeHTML(text).replace(/<[^>]*>/g, '').trim().slice(0, 300);
};

function EventoDetalleContent() {
  const params = useParams();
  const router = useRouter();

  const rawEventoId = Number(params.id);
  const eventoId = Number.isInteger(rawEventoId) && rawEventoId > 0 && rawEventoId < 10000000 ? rawEventoId : null;
  
  if (eventoId === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">ID de evento inválido</h2>
            <Link href="/eventos" className="text-blue-600 hover:underline font-medium">← Volver a eventos</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const [evento, setEvento] = useState<Evento | null>(null);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  useEffect(() => {
    let isMounted = true;

    const fetchEvento = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [eventoRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/gacetaEventos`),
          api.get(`/institucionesPrincipal/${institucionId}`)
        ]);

        if (!isMounted) return;

        const eventoEncontrado = eventoRes.data.upea_evento?.find(
          (e: any) => e.evento_id === eventoId
        );

        if (!eventoEncontrado) {
          setError('Evento no encontrado');
          return;
        }

        setEvento({
          evento_id: eventoEncontrado.evento_id,
          evento_titulo: sanitizeTextField(eventoEncontrado.evento_titulo, 200),
          evento_imagen: eventoEncontrado.evento_imagen,
          evento_descripcion: eventoEncontrado.evento_descripcion,
          evento_fecha: eventoEncontrado.evento_fecha,
          evento_hora: eventoEncontrado.evento_hora,
          evento_lugar: sanitizeTextField(eventoEncontrado.evento_lugar, 150),
          tipo_evento: sanitizeTextField(eventoEncontrado.tipo_evento, 50)
        });

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
            console.warn('Error cargando evento:', err);
          }
          setError('No se pudo cargar la información del evento');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvento();
    return () => { isMounted = false; };
  }, [eventoId, institucionId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImageModalOpen(false);
    };
    
    if (imageModalOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [imageModalOpen]);

  const formatDateFull = (dateString?: string) => {
    if (!dateString) return 'Fecha por confirmar';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).format(date);
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Hora por confirmar';
    return timeString.substring(0, 5);
  };

  const getTypeStyle = (type: string) => {
    const t = type?.toUpperCase() || '';
    const safePrimary = getSafeColor(primaryColor, '#04246C');
    const safeSecondary = getSafeColor(secondaryColor, '#FC0102');
    
    if (t.includes('TALLER') || t.includes('WORKSHOP')) 
      return { backgroundColor: `${hexToRgba(safeSecondary, 0.15)}`, color: safeSecondary };
    if (t.includes('SEMINARIO')) 
      return { backgroundColor: `${hexToRgba('#f59e0b', 0.15)}`, color: '#f59e0b' };
    return { backgroundColor: `${hexToRgba(safePrimary, 0.15)}`, color: safePrimary };
  };

  const imageUrl = useMemo(() => {
    if (!evento?.evento_imagen) return '';
    const url = getStorageUrl(evento.evento_imagen);
    return isValidImageUrl(url) ? url : '';
  }, [evento?.evento_imagen]);

  const handleShare = async () => {
    if (!evento) return;
    const safeDescription = sanitizeForShare(evento.evento_descripcion);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: evento.evento_titulo,
          text: safeDescription,
          url: window.location.href,
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Share cancelado o error:', err);
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  const openImageModal = () => setImageModalOpen(true);
  const closeImageModal = () => setImageModalOpen(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}`, borderTopColor: primaryColor }} />
            <p className="text-gray-600">Cargando evento...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">📭</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">{error || 'Evento no encontrado'}</h2>
            <p className="text-gray-600 mb-8">El evento que buscas no existe o ha sido cancelado</p>
            <div className="flex gap-4 justify-center">
              <Link href="/eventos" className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
                <ArrowLeft className="w-5 h-5" /> Volver a eventos
              </Link>
            </div>
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
        {/* Hero Image */}
        {evento.evento_imagen && imageUrl ? (
          <div className="relative h-72 md:h-96 lg:h-[500px] group cursor-pointer" onClick={openImageModal}>
            <Image
              src={imageUrl}
              alt={evento.evento_titulo}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${hexToRgba(tertiaryColor, 0.6)} 0%, ${hexToRgba(primaryColor, 0.9)} 100%)` }} />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
              <div className="text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 shadow-2xl mb-3 inline-flex items-center gap-2">
                  <ZoomIn className="w-6 h-6" style={{ color: primaryColor }} />
                  <span className="text-gray-900 font-semibold text-sm">Ver imagen completa</span>
                </div>
                <p className="text-white/90 text-sm font-medium drop-shadow-lg">Haz click para ampliar</p>
              </div>
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-16 left-0 right-0 p-6 md:p-10">
              <div className="max-w-6xl mx-auto">
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-white/95 backdrop-blur-sm mb-4 shadow-lg" style={getTypeStyle(evento.tipo_evento)}>
                  {evento.tipo_evento}
                </span>
                <h1 className="text-3xl md:text-5xl font-bold text-white font-serif">
                  {evento.evento_titulo}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          /* No image fallback */
          <div className="relative py-16" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.15)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
            <div className="max-w-6xl mx-auto px-4">
              <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors" style={{ color: primaryColor }}>
                <div className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span>Volver</span>
              </button>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                  <Calendar className="w-7 h-7" style={{ color: primaryColor }} />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-serif">{evento.evento_titulo}</h1>
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={getTypeStyle(evento.tipo_evento)}>
                {evento.tipo_evento}
              </span>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {imageModalOpen && evento.evento_imagen && imageUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm" 
            onClick={closeImageModal}
            role="dialog" 
            aria-modal="true" 
            aria-label="Vista ampliada de imagen"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); closeImageModal(); }} 
              className="absolute top-6 right-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl" 
              title="Cerrar (ESC)" 
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); closeImageModal(); }} 
              className="absolute top-6 left-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl" 
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
              <div className="max-w-md h-auto object-contain rounded-lg shadow-2xl mx-auto">
                <Image 
                  src={imageUrl} 
                  alt={evento.evento_titulo} 
                  width={1920} 
                  height={1080} 
                  className="w-full h-full object-contain rounded-lg shadow-2xl" 
                  unoptimized 
                />
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
              <p className="text-white text-lg font-semibold bg-black/60 backdrop-blur-md inline-block px-6 py-3 rounded-full">
                {evento.evento_titulo}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-20">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-xl border p-6 md:p-8" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                
                {/* Date/Time/Location Cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className="p-5 rounded-2xl border text-center" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}`, background: `${hexToRgba(primaryColor, 0.05)}` }}>
                    <div className="p-2.5 rounded-xl mx-auto mb-3 w-fit" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                      <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Fecha</p>
                    <p className="font-medium text-gray-900">{formatDateFull(evento.evento_fecha)}</p>
                  </div>
                  
                  <div className="p-5 rounded-2xl border text-center" style={{ borderColor: `${hexToRgba(secondaryColor, 0.2)}`, background: `${hexToRgba(secondaryColor, 0.05)}` }}>
                    <div className="p-2.5 rounded-xl mx-auto mb-3 w-fit" style={{ backgroundColor: `${hexToRgba(secondaryColor, 0.15)}` }}>
                      <Clock className="w-5 h-5" style={{ color: secondaryColor }} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: `${hexToRgba(secondaryColor, 0.7)}` }}>Hora</p>
                    <p className="font-medium text-gray-900">{formatTime(evento.evento_hora)}</p>
                  </div>
                  
                  <div className="p-5 rounded-2xl border text-center" style={{ borderColor: `${hexToRgba(tertiaryColor, 0.2)}`, background: `${hexToRgba(tertiaryColor, 0.05)}` }}>
                    <div className="p-2.5 rounded-xl mx-auto mb-3 w-fit" style={{ backgroundColor: `${hexToRgba(tertiaryColor, 0.15)}` }}>
                      <MapPin className="w-5 h-5" style={{ color: tertiaryColor }} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: `${hexToRgba(tertiaryColor, 0.7)}` }}>Lugar</p>
                    <p className="font-medium text-gray-900">{evento.evento_lugar || 'Por confirmar'}</p>
                  </div>
                </div>

                {/* Description */}
                {evento.evento_descripcion && (
                  <div className="mb-10">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Descripción del Evento</h2>
                    <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(evento.evento_descripcion) }} />
                  </div>
                )}

                {/* Image Preview (if has image) */}
                {evento.evento_imagen && imageUrl && (
                  <div 
                    className="mb-10 p-5 rounded-2xl border cursor-pointer group hover:shadow-lg transition-all" 
                    onClick={openImageModal}
                    role="button" 
                    tabIndex={0} 
                    onKeyDown={(e) => e.key === 'Enter' && openImageModal()}
                    style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}`, background: `${hexToRgba(primaryColor, 0.05)}` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative w-32 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                        <Image 
                          src={imageUrl} 
                          alt={evento.evento_titulo} 
                          fill 
                          className="object-cover" 
                          sizes="128px" 
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 flex items-center gap-2 text-gray-900">
                          <Maximize2 className="w-5 h-5" style={{ color: primaryColor }} />
                          Imagen del evento
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">Haz click para ver en tamaño completo</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openImageModal(); }} 
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <ZoomIn className="w-4 h-4" /> Ver imagen completa
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-6 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>

                  {institucion?.institucion_correo1 && (
                    <a 
                      href={`mailto:${institucion.institucion_correo1}?subject=Consulta sobre: ${encodeURIComponent(evento.evento_titulo)}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:shadow-lg border-2"
                      style={{ borderColor: secondaryColor, color: secondaryColor }}
                    >
                      <Mail className="w-4 h-4" /> Consultar información
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-lg border p-6 lg:sticky lg:top-24" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                <div className="flex items-center gap-3 mb-6 pb-6 border-b" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                    <Calendar className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900">Información</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Categoría</p>
                    <p className="font-semibold text-gray-900">{evento.tipo_evento || 'General'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Institución</p>
                    <p className="font-semibold text-gray-900">{institucion?.institucion_nombre || 'UPEA'}</p>
                  </div>

                  {evento.evento_lugar && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Ubicación</p>
                      <p className="font-medium text-gray-900">{evento.evento_lugar}</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                  <Link 
                    href="/eventos"
                    className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 rounded-full font-medium transition-all hover:shadow-lg border-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Ver todos los eventos
                  </Link>
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

export default function EventoDetallePage() {
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
      <EventoDetalleContent />
    </Suspense>
  );
}