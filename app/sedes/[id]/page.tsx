'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  MapPin, Phone, Mail, Clock, ArrowLeft, Building2, 
  Loader2, User, Navigation
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import api from '@/lib/axios';
import { getStorageUrl } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

interface Sede {
  sede_id: number;
  sede_nombre: string;
  sede_direccion?: string;
  sede_telefono?: string;
  sede_coordinador?: string;
  sede_imagen?: string;
}

const isValidEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes('<') && !email.includes('>');
};

const sanitizeEmail = (email: string | undefined): string => {
  if (!email || !isValidEmail(email)) return '';
  return email.replace(/[<>\"'&]/g, '');
};

const isValidHexColor = (color: string | undefined): boolean => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getSafeColor = (color: string | undefined, fallback: string): string => {
  return isValidHexColor(color) ? color! : fallback;
};

function SedeDetalleContent() {
  const params = useParams();
  const router = useRouter();
  const rawSedeId = Number(params.id);
  const sedeId = Number.isInteger(rawSedeId) && rawSedeId >= 0 && rawSedeId < 10000000 ? rawSedeId : null;
  
  const [sede, setSede] = useState<Sede | null>(null);
  const [institucion, setInstitucion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  useEffect(() => {
    if (sedeId === null) {
      setLoading(false);
      return;
    }

    const fetchSede = async () => {
      try {
        setLoading(true);
        const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
        
        const recursosRes = await api.get(`/institucion/${institucionId}/recursos`);
        const instRes = await api.get(`/institucionesPrincipal/${institucionId}`);
        
        setInstitucion(instRes.data.Descripcion);

        if (sedeId === 0) {
          setSede({
            sede_id: 0,
            sede_nombre: 'Sede Central',
            sede_direccion: sanitizeHTML(instRes.data.Descripcion?.institucion_direccion || 'Por definir'),
            sede_telefono: instRes.data.Descripcion?.institucion_celular1?.toString() || '',
            sede_coordinador: 'Dirección General',
            sede_imagen: instRes.data.Descripcion?.institucion_logo
          });
        } else {
          const publicacion = recursosRes.data.upea_publicaciones?.find(
            (p: any) => p.publicaciones_id === sedeId && p.publicaciones_tipo === 'SEDES'
          );

          if (publicacion) {
            setSede({
              sede_id: publicacion.publicaciones_id,
              sede_nombre: sanitizeHTML(publicacion.publicaciones_titulo
                .replace('Sede Academica de ', '')
                .replace('Sede Academica ', '')),
              sede_direccion: sanitizeHTML(publicacion.publicaciones_descripcion || '').replace(/<[^>]*>/g, '') || 'Por definir',
              sede_telefono: '',
              sede_coordinador: sanitizeHTML(publicacion.publicaciones_autor || 'Coordinación'),
              sede_imagen: publicacion.publicaciones_imagen
            });
          }
        }

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          setPrimaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_terciario, '#020733'));
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error cargando sede:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSede();
  }, [sedeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)` }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${primaryColor}30`, borderTopColor: primaryColor }} />
            <p className="text-gray-600">Cargando información...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!sede || sedeId === null) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-6">🏛️</div>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Sede no encontrada</h2>
            <p className="text-gray-600 mb-8">La sede que buscas no existe o ha sido eliminada</p>
            <Link href="/sedes" className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
              <ArrowLeft className="w-5 h-5" /> Volver a sedes
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, #fff 0%, ${primaryColor}08 100%)` }}>
      <Header />
      
      <main className="flex-1">
        {/* Hero Image */}
        <div className="relative h-72 md:h-96 lg:h-[500px]">
          {sede.sede_imagen ? (
            <>
              <Image
                src={getStorageUrl(sede.sede_imagen)}
                alt={sede.sede_nombre}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${tertiaryColor}60 0%, ${primaryColor}90 100%)` }} />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${tertiaryColor})` }}>
              <Building2 className="w-32 h-32 text-white/20" />
            </div>
          )}

          <button
            onClick={() => router.back()}
            className="absolute top-6 left-6 flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-sm rounded-full text-sm font-semibold hover:bg-white transition-all shadow-xl"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
              {sede.sede_id === 0 && (
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-white/95 backdrop-blur-sm mb-4 shadow-lg" style={{ color: primaryColor }}>
                  Sede Principal
                </span>
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-white font-serif">
                {sede.sede_nombre}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-20">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Main Info */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-xl border p-6 md:p-8" style={{ borderColor: `${primaryColor}20` }}>
                
                {/* Coordinador */}
                {sede.sede_coordinador && (
                  <div className="mb-8 p-5 rounded-2xl" style={{ background: `${primaryColor}08` }}>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl" style={{ backgroundColor: `${primaryColor}15` }}>
                        <User className="w-6 h-6" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: primaryColor }}>Coordinador/a</p>
                        <p className="text-gray-700 font-medium">{sede.sede_coordinador}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Cards */}
                <div className="space-y-4 mb-8">
                  {sede.sede_direccion && (
                    <div className="p-5 rounded-2xl border" style={{ borderColor: `${primaryColor}20`, background: `${primaryColor}05` }}>
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${primaryColor}15` }}>
                          <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-2" style={{ color: primaryColor }}>Ubicación</p>
                          <p className="text-gray-700 leading-relaxed">{sede.sede_direccion}</p>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede.sede_direccion)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium hover:underline"
                            style={{ color: primaryColor }}
                          >
                            <Navigation className="w-4 h-4" />
                            Ver en Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {sede.sede_id === 0 && institucion && (
                    <>
                      {institucion.institucion_correo1 && isValidEmail(institucion.institucion_correo1) && (
                        <div className="p-5 rounded-2xl border" style={{ borderColor: `${secondaryColor}20`, background: `${secondaryColor}05` }}>
                          <div className="flex items-start gap-4">
                            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${secondaryColor}15` }}>
                              <Mail className="w-5 h-5" style={{ color: secondaryColor }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold mb-2" style={{ color: secondaryColor }}>Correo electrónico</p>
                              <a href={`mailto:${sanitizeEmail(institucion.institucion_correo1)}`} className="text-gray-700 hover:underline font-medium">
                                {institucion.institucion_correo1}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-5 rounded-2xl border" style={{ borderColor: `${tertiaryColor}20`, background: `${tertiaryColor}05` }}>
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${tertiaryColor}15` }}>
                            <Clock className="w-5 h-5" style={{ color: tertiaryColor }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: tertiaryColor }}>Horario de atención</p>
                            <p className="text-gray-700">
                              <span className="font-medium">Lunes a Viernes:</span> 8:00 - 12:00 y 14:00 - 18:00
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 pt-6 border-t" style={{ borderColor: `${primaryColor}20` }}>
                  <Link
                    href="/contacto"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Mail className="w-5 h-5" />
                    Contacto General
                  </Link>
                  <Link
                    href="/sedes"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border-2 hover:bg-gray-50 transition-all"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Ver todas las sedes
                  </Link>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-lg border p-6 lg:sticky lg:top-24" style={{ borderColor: `${primaryColor}20` }}>
                <div className="flex items-center gap-3 mb-6 pb-6 border-b" style={{ borderColor: `${primaryColor}20` }}>
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Building2 className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900">Información</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${primaryColor}70` }}>Sede</p>
                    <p className="font-bold text-gray-900 text-lg">{sede.sede_nombre}</p>
                  </div>
                  
                  {sede.sede_telefono && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${primaryColor}70` }}>Teléfono</p>
                      <a href={`tel:${sede.sede_telefono}`} className="flex items-center gap-2 font-medium hover:underline" style={{ color: primaryColor }}>
                        <Phone className="w-4 h-4" />
                        {sede.sede_telefono}
                      </a>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `${primaryColor}70` }}>Estado</p>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Activa
                    </span>
                  </div>
                </div>

                {sede.sede_id === 0 && (
                  <div className="mt-8 pt-8 border-t" style={{ borderColor: `${primaryColor}20` }}>
                    <div className="p-4 rounded-2xl" style={{ background: `${primaryColor}08` }}>
                     
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SedeDetallePage() {
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
      <SedeDetalleContent />
    </Suspense>
  );
}