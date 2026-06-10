// app/publicaciones/[id]/page.tsx
'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar, User, Download, Share2, ExternalLink,
  BookOpen, FileText, Printer, Maximize2, X, ZoomIn, Mail
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

interface Publicacion {
  publicaciones_id: number;
  publicaciones_titulo: string;
  publicaciones_imagen?: string;
  publicaciones_descripcion?: string;
  publicaciones_documento?: string;
  publicaciones_fecha: string;
  publicaciones_autor?: string;
  publicaciones_tipo?: string;
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

const sanitizeForShare = (text: string | undefined): string => {
  if (!text) return '';
  return sanitizeHTML(text).replace(/<[^>]*>/g, '').trim().slice(0, 300);
};

function PublicacionDetalleContent() {
  const params = useParams();
  const router = useRouter();
 
  const rawPublicacionId = Number(params.id);
  const publicacionId = Number.isInteger(rawPublicacionId) && rawPublicacionId > 0 && rawPublicacionId < 10000000 
    ? rawPublicacionId 
    : null;
  
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  useEffect(() => {
    if (publicacionId === null) {
      setLoading(false);
      setError('ID de publicación inválido');
      return;
    }

    const fetchPublicacion = async () => {
      try {
        setLoading(true);
        setError(null);
        const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;

        const [publiRes, instRes] = await Promise.all([
          api.get(`/institucion/${institucionId}/recursos`),
          api.get(`/institucionesPrincipal/${institucionId}`)
        ]);

        const publicacionEncontrada = publiRes.data.upea_publicaciones?.find(
          (p: any) => p.publicaciones_id === publicacionId
        );

        if (!publicacionEncontrada) {
          setError('Publicación no encontrada');
          return;
        }

        setPublicacion({
          publicaciones_id: publicacionEncontrada.publicaciones_id,
          publicaciones_titulo: sanitizeHTML(publicacionEncontrada.publicaciones_titulo || 'Sin título'),
          publicaciones_imagen: publicacionEncontrada.publicaciones_imagen,
          publicaciones_descripcion: publicacionEncontrada.publicaciones_descripcion,
          publicaciones_documento: publicacionEncontrada.publicaciones_documento,
          publicaciones_fecha: publicacionEncontrada.publicaciones_fecha,
          publicaciones_autor: sanitizeHTML(publicacionEncontrada.publicaciones_autor || ''),
          publicaciones_tipo: sanitizeHTML(publicacionEncontrada.publicaciones_tipo || '')
        });
        setInstitucion(instRes.data.Descripcion);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          setPrimaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_terciario, '#020733'));
        }
      } catch (err: any) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error cargando publicación:', err);
        }
        setError('No se pudo cargar la información de la publicación');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicacion();
  }, [publicacionId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageModalOpen(false);
        setPdfModalOpen(false);
      }
    };
    
    if (imageModalOpen || pdfModalOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [imageModalOpen, pdfModalOpen]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      return new Date(dateString).toLocaleDateString('es-BO', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const imageUrl = useMemo(() => {
    if (!publicacion?.publicaciones_imagen) return '';
    const url = getStorageUrl(publicacion.publicaciones_imagen);
    return isValidDocumentUrl(url) ? url : '';
  }, [publicacion?.publicaciones_imagen]);

  const pdfUrl = useMemo(() => {
    if (!publicacion?.publicaciones_documento) return '';
    const url = getStorageUrl(publicacion.publicaciones_documento);
    return isValidDocumentUrl(url) ? url : '';
  }, [publicacion?.publicaciones_documento]);

  const handleShare = async () => {
    if (!publicacion) return;
    const safeDescription = sanitizeForShare(publicacion.publicaciones_descripcion);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: publicacion.publicaciones_titulo,
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

  const handlePrint = () => window.print();

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

  if (error || !publicacion || publicacionId === null) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">📭</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">{error || 'Publicación no encontrada'}</h2>
            <p className="text-gray-600 mb-8">La publicación que buscas no existe o ha sido eliminada</p>
            <Link href="/publicaciones" className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
              <ArrowLeft className="w-5 h-5" /> Volver a publicaciones
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
        <div className="relative h-72 md:h-96 lg:h-[500px] group cursor-pointer" onClick={publicacion.publicaciones_imagen ? () => setImageModalOpen(true) : undefined}>
          {publicacion.publicaciones_imagen && imageUrl ? (
            <>
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
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.8)}, ${hexToRgba(tertiaryColor, 0.9)})` }}>
              <BookOpen className="w-32 h-32 text-white/20" />
            </div>
          )}


          {/* Title overlay */}
          <div className="absolute bottom-16 left-0 right-0 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
              {publicacion.publicaciones_tipo && (
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-white/95 backdrop-blur-sm mb-4 shadow-lg" style={{ color: primaryColor }}>
                  {publicacion.publicaciones_tipo}
                </span>
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-white font-serif">
                {publicacion.publicaciones_titulo}
              </h1>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {imageModalOpen && publicacion.publicaciones_imagen && imageUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm" 
            onClick={() => setImageModalOpen(false)}
            role="dialog" 
            aria-modal="true" 
            aria-label="Vista ampliada de imagen"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setImageModalOpen(false); }} 
              className="absolute top-6 right-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl" 
              title="Cerrar (ESC)" 
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setImageModalOpen(false); }} 
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

        {/* PDF Modal */}
        {pdfModalOpen && publicacion.publicaciones_documento && pdfUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm" 
            onClick={() => setPdfModalOpen(false)}
            role="dialog" 
            aria-modal="true" 
            aria-label="Vista de documento PDF"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setPdfModalOpen(false); }} 
              className="absolute top-6 right-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl" 
              title="Cerrar (ESC)" 
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setPdfModalOpen(false); }} 
              className="absolute top-6 left-6 z-[110] p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 shadow-xl flex items-center gap-2" 
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
              <span className="text-white text-sm font-medium hidden sm:inline">Volver</span>
            </button>
            <a 
              href={pdfUrl} 
              download 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()} 
              className="absolute bottom-6 right-6 z-[110] flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white font-medium text-sm shadow-xl"
            >
              <Download className="w-4 h-4" /> Descargar
            </a>
            <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
                <iframe 
                  src={`${pdfUrl}#toolbar=0&navpanes=0`} 
                  className="w-full h-[85vh]" 
                  title={publicacion.publicaciones_titulo} 
                  loading="lazy" 
                  referrerPolicy="strict-origin-when-cross-origin" 
                />
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
              <p className="text-white text-lg font-semibold bg-black/60 backdrop-blur-md inline-block px-6 py-3 rounded-full">
                <FileText className="w-5 h-5 inline mr-2" /> {publicacion.publicaciones_titulo}
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
                
                {/* Metadata */}
                <div className="flex flex-wrap gap-6 mb-8 pb-6 border-b" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                  {publicacion.publicaciones_autor && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                        <User className="w-5 h-5" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Autor</p>
                        <p className="font-medium text-gray-900">{publicacion.publicaciones_autor}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${hexToRgba(secondaryColor, 0.15)}` }}>
                      <Calendar className="w-5 h-5" style={{ color: secondaryColor }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `${hexToRgba(secondaryColor, 0.7)}` }}>Fecha</p>
                      <p className="font-medium text-gray-900">{formatDate(publicacion.publicaciones_fecha)}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {publicacion.publicaciones_descripcion && (
                  <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed mb-10">
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(publicacion.publicaciones_descripcion) }} />
                  </div>
                )}

                {/* Attachments */}
                <div className="space-y-4 mb-10">
                  {publicacion.publicaciones_imagen && imageUrl && (
                    <div 
                      className="p-5 rounded-2xl border cursor-pointer group hover:shadow-lg transition-all" 
                      onClick={() => setImageModalOpen(true)}
                      role="button" 
                      tabIndex={0} 
                      onKeyDown={(e) => e.key === 'Enter' && setImageModalOpen(true)}
                      style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}`, background: `${hexToRgba(primaryColor, 0.05)}` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                          <Image 
                            src={imageUrl} 
                            alt={publicacion.publicaciones_titulo} 
                            fill 
                            className="object-cover" 
                            sizes="96px" 
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1 flex items-center gap-2 text-gray-900">
                            <FileText className="w-5 h-5" style={{ color: primaryColor }} />
                            Imagen de la publicación
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">Haz click para ver en tamaño completo</p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setImageModalOpen(true); }} 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Maximize2 className="w-4 h-4" /> Ver imagen completa
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {publicacion.publicaciones_documento && pdfUrl && (
                    <div 
                      className="p-5 rounded-2xl border cursor-pointer group hover:shadow-lg transition-all" 
                      onClick={() => setPdfModalOpen(true)}
                      role="button" 
                      tabIndex={0} 
                      onKeyDown={(e) => e.key === 'Enter' && setPdfModalOpen(true)}
                      style={{ borderColor: `${hexToRgba(secondaryColor, 0.2)}`, background: `${hexToRgba(secondaryColor, 0.05)}` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 shadow-md">
                          <FileText className="w-12 h-12 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1 flex items-center gap-2 text-gray-900">
                            <FileText className="w-5 h-5" style={{ color: secondaryColor }} />
                            Documento PDF adjunto
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">Haz click para visualizar el documento</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setPdfModalOpen(true); }} 
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md text-white"
                              style={{ backgroundColor: secondaryColor }}
                            >
                              <Maximize2 className="w-4 h-4" /> Ver documento
                            </button>
                            <a 
                              href={pdfUrl} 
                              download 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()} 
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md border-2"
                              style={{ borderColor: secondaryColor, color: secondaryColor }}
                            >
                              <Download className="w-4 h-4" /> Descargar
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-6 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>

              
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
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Categoría</p>
                    <p className="font-semibold text-gray-900">{publicacion.publicaciones_tipo || 'General'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Institución</p>
                    <p className="font-semibold text-gray-900">{institucion?.institucion_nombre || 'UPEA'}</p>
                  </div>

                  {institucion?.institucion_correo1 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${hexToRgba(primaryColor, 0.7)}` }}>Contacto</p>
                      <a 
                        href={`mailto:${institucion.institucion_correo1}`} 
                        className="flex items-center gap-2 font-medium hover:underline"
                        style={{ color: primaryColor }}
                      >
                        <Mail className="w-4 h-4" />
                        {institucion.institucion_correo1}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                  <Link 
                    href="/publicaciones"
                    className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 rounded-full font-medium transition-all hover:shadow-lg border-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Ver todas las publicaciones
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