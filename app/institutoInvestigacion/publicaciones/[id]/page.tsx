'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar, BookOpen, Download, Share2, ExternalLink,
  User, FileText, Loader2, X, ZoomIn, Mail, Printer
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML, sanitizeText} from '@/lib/sanitize';
import { validateNumericId } from '@/lib/security';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

// ==================== TIPOS ====================
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
  institucion_nombre?: string;
  institucion_correo1?: string;
  colorinstitucion: Array<{
    color_primario: string;
    color_secundario: string;
    color_terciario: string;
  }>;
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

// ==================== COMPONENTE CONTENIDO ====================
function PublicacionDetalleContent() {
  const params = useParams();
  const router = useRouter();
  
  const rawPublicacionId = Number(params.id);
  const publicacionId = Number.isInteger(rawPublicacionId) && rawPublicacionId > 0 && rawPublicacionId < 10000000 
    ? rawPublicacionId 
    : null;
  
  const [publicacion, setPublicacion] = useState<PublicacionInvestigacion | null>(null);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    if (publicacionId === null) {
      setLoading(false);
      setError('ID de publicación inválido');
      return;
    }

    let isMounted = true;
    const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;

    const fetchPublicacion = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [publiRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/recursos`),
          api.get(`/institucionesPrincipal/${institucionId}`)
        ]);

        if (!isMounted) return;

        const esTipoInvestigacion = (valor: any): boolean => {
          if (!valor) return false;
          const normalized = String(valor).trim().toUpperCase();
          return normalized.includes('INVESTIGACION') || 
                 normalized.includes('INSTITUTO') ||
                 normalized === 'UPEA' ||
                 normalized === 'ENF' ||
                 normalized === 'SOCIEDAD CIENTIFICA';
        };

        const publicacionEncontrada = publiRes.data.upea_publicaciones?.find(
          (p: any) => p.publicaciones_id === publicacionId && esTipoInvestigacion(p.publicaciones_tipo)
        );

        const publicacionFallback = !publicacionEncontrada 
          ? publiRes.data.upea_publicaciones?.find((p: any) => p.publicaciones_id === publicacionId)
          : null;

        const publicacionFinal = publicacionEncontrada || publicacionFallback;

        if (!publicacionFinal) {
          setError(`Publicación #${publicacionId} no encontrada`);
          return;
        }

        setPublicacion({
          publicaciones_id: publicacionFinal.publicaciones_id,
          publicaciones_titulo: sanitizeText(publicacionFinal.publicaciones_titulo, 200),
          publicaciones_imagen: publicacionFinal.publicaciones_imagen,
          publicaciones_descripcion: publicacionFinal.publicaciones_descripcion,
          publicaciones_documento: publicacionFinal.publicaciones_documento,
          publicaciones_fecha: publicacionFinal.publicaciones_fecha,
          publicaciones_autor: sanitizeText(publicacionFinal.publicaciones_autor, 100),
          publicaciones_tipo: sanitizeText(publicacionFinal.publicaciones_tipo, 50)
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
            console.warn('Error cargando publicación:', err);
          }
          const errorMessage = err.response?.status === 404 
            ? 'La publicación no existe en el servidor'
            : err.response?.status === 401
            ? 'Error de autenticación con la API'
            : 'Error al cargar la publicación';
          setError(errorMessage);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPublicacion();
    return () => { isMounted = false; };
  }, [publicacionId]);


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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      return new Date(dateString).toLocaleDateString('es-BO', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const documentoUrl = useMemo(() => {
    if (!publicacion?.publicaciones_documento) return '';
    const url = getStorageUrl(publicacion.publicaciones_documento);
    return isValidResourceUrl(url) ? url : '';
  }, [publicacion?.publicaciones_documento]);

  const imageUrl = useMemo(() => {
    if (!publicacion?.publicaciones_imagen) return '';
    const url = getStorageUrl(publicacion.publicaciones_imagen);
    return isValidResourceUrl(url) ? url : '';
  }, [publicacion?.publicaciones_imagen]);

  const handleShare = async () => {
    if (!publicacion) return;
    const safeTitle = sanitizeText(publicacion.publicaciones_titulo, 100);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: safeTitle,
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

  const institucionNombre = sanitizeText(institucion?.institucion_nombre || '', 100) || 'UPEA';

  // ==================== RENDER LOADING ====================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${hexToRgba(primaryColor, 0.3)}`, borderTopColor: primaryColor }} />
            <p className="text-gray-600">Cargando publicación...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ==================== RENDER ERROR ====================
  if (error || !publicacion || publicacionId === null) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">📚</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">{error || 'Publicación no encontrada'}</h2>
            <p className="text-gray-600 mb-8">La publicación que buscas no existe o ha sido eliminada</p>
            <Link href="/institutoInvestigacion" className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
              <ArrowLeft className="w-5 h-5" /> Volver al instituto
            </Link>
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
        {publicacion.publicaciones_imagen && imageUrl ? (
          <div className="relative h-72 md:h-96 lg:h-[500px] group cursor-pointer" onClick={openImageModal}>
            <Image
              src={imageUrl}
              alt={publicacion.publicaciones_titulo}
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

            {/* Back button */}
            <button
              onClick={(e) => { e.stopPropagation(); router.back(); }}
              className="absolute top-6 left-6 flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-sm rounded-full text-sm font-semibold hover:bg-white transition-all shadow-xl z-10"
              aria-label="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            {/* Share button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="absolute top-6 right-6 p-3 bg-white/95 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-xl z-10"
              title="Compartir"
              aria-label="Compartir publicación"
            >
              <Share2 className="w-5 h-5" style={{ color: primaryColor }} />
            </button>

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-bold text-white font-serif">
                  {publicacion.publicaciones_titulo}
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

                </div>

              </button>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                  <BookOpen className="w-7 h-7" style={{ color: primaryColor }} />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-serif">{publicacion.publicaciones_titulo}</h1>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {imageModalOpen && publicacion.publicaciones_imagen && imageUrl && (
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
              <div className="relative w-full max-w-4xl max-h-[85vh]">
                <Image 
                  src={imageUrl} 
                  alt={publicacion.publicaciones_titulo} 
                  width={1920} 
                  height={1080} 
                  className="w-full h-full object-contain rounded-lg shadow-2xl" 
                  unoptimized 
                />
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
              <p className="text-white text-lg font-semibold bg-black/60 backdrop-blur-md inline-block px-6 py-3 rounded-full">
                {publicacion.publicaciones_titulo}
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
                
                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 mb-8 pb-6 border-b" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                      <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Fecha</p>
                      <p className="font-medium text-gray-900">{formatDate(publicacion.publicaciones_fecha)}</p>
                    </div>
                  </div>
                  
                  {publicacion.publicaciones_autor && (
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hexToRgba(secondaryColor, 0.15)}` }}>
                        <User className="w-5 h-5" style={{ color: secondaryColor }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `${hexToRgba(secondaryColor, 0.7)}` }}>Autor</p>
                        <p className="font-medium text-gray-900">{publicacion.publicaciones_autor}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {publicacion.publicaciones_descripcion && (
                  <div className="mb-10">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Descripción</h2>
                    <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(publicacion.publicaciones_descripcion) }} />
                  </div>
                )}

                {/* Document Download */}
                {documentoUrl && (
                  <div className="mb-10 p-6 rounded-2xl border" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}`, background: `${hexToRgba(primaryColor, 0.05)}` }}>
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
                      <FileText className="w-5 h-5" style={{ color: primaryColor }} />
                      Documento disponible
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={documentoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm text-white transition-all hover:shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver documento
                      </a>
                      <a
                        href={documentoUrl}
                        download
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:shadow-lg border-2"
                        style={{ borderColor: secondaryColor, color: secondaryColor }}
                      >
                        <Download className="w-4 h-4" />
                        Descargar PDF
                      </a>
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                {publicacion.publicaciones_imagen && imageUrl && (
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
                          alt={publicacion.publicaciones_titulo} 
                          fill 
                          className="object-cover" 
                          sizes="128px" 
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 flex items-center gap-2 text-gray-900">
                          <ZoomIn className="w-5 h-5" style={{ color: primaryColor }} />
                          Imagen de la publicación
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
                  <button 
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:shadow-lg border-2"
                    style={{ borderColor: secondaryColor, color: secondaryColor }}
                  >
                    <Share2 className="w-4 h-4" /> Compartir
                  </button>
                  {institucion?.institucion_correo1 && (
                    <a 
                      href={`mailto:${institucion.institucion_correo1}?subject=Consulta sobre: ${encodeURIComponent(publicacion.publicaciones_titulo)}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:shadow-lg border-2"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <Mail className="w-4 h-4" /> Consultar
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
                    <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900">Información</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Tipo</p>
                    <p className="font-semibold text-gray-900">{publicacion.publicaciones_tipo || 'Publicación'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Institución</p>
                    <p className="font-semibold text-gray-900">{institucionNombre}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Estado</p>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Publicada
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                  <Link 
                    href="/institutoInvestigacion"
                    className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 rounded-full font-medium transition-all hover:shadow-lg border-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al instituto
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

export default function PublicacionDetallePage() {
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
      <PublicacionDetalleContent />
    </Suspense>
  );
}