'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, MapPin, Phone, ArrowLeft, Loader2, GraduationCap, Search, X } from 'lucide-react';

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
  estado: string;
}

const isValidHexColor = (color: string | undefined): boolean => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getSafeColor = (color: string | undefined, fallback: string): string => {
  return isValidHexColor(color) ? color! : fallback;
};

const searchSedes = (sedes: Sede[], query: string): Sede[] => {
  if (!query.trim()) return sedes;
  
  const safeQuery = query.toLowerCase().trim().replace(/[<>{}]/g, '');
  
  return sedes.filter(sede => {
    const nombre = sede.sede_nombre?.toLowerCase() || '';
    const direccion = sede.sede_direccion?.toLowerCase() || '';
    const coordinador = sede.sede_coordinador?.toLowerCase() || '';
    
    return nombre.includes(safeQuery) || 
           direccion.includes(safeQuery) || 
           coordinador.includes(safeQuery);
  });
};

export default function SedesPage() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const fetchSedes = async () => {
      try {
        setLoading(true);
        const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
        const recursosRes = await api.get(`/institucion/${institucionId}/recursos`);
        const instRes = await api.get(`/institucionesPrincipal/${institucionId}`);
        
        const sedesFiltradas = (recursosRes.data.upea_publicaciones || [])
          .filter((pub: any) => pub.publicaciones_tipo === 'SEDES');

        const sedesMapeadas = sedesFiltradas.map((pub: any) => ({
          sede_id: pub.publicaciones_id,
          sede_nombre: pub.publicaciones_titulo.replace('Sede Academica de ', '').replace('Sede Academica ', ''),
          sede_direccion: sanitizeHTML(pub.publicaciones_descripcion || '').replace(/<[^>]*>/g, '') || 'Por definir',
          sede_telefono: '',
          sede_coordinador: sanitizeHTML(pub.publicaciones_autor || 'Coordinación'),
          sede_imagen: pub.publicaciones_imagen,
          estado: '1'
        })) as Sede[];
        
        const sedesCompletas = [
          {
            sede_id: 0,
            sede_nombre: 'Sede Central',
            sede_direccion: sanitizeHTML(instRes.data.Descripcion?.institucion_direccion || 'Por definir'),
            sede_telefono: instRes.data.Descripcion?.institucion_celular1?.toString() || '',
            sede_coordinador: 'Dirección General',
            sede_imagen: instRes.data.Descripcion?.institucion_logo,
            estado: '1'
          },
          ...sedesMapeadas
        ];

        setSedes(sedesCompletas);

        if (instRes.data.Descripcion?.colorinstitucion?.[0]) {
          setPrimaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(instRes.data.Descripcion.colorinstitucion[0].color_terciario, '#020733'));
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error cargando sedes:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSedes();
  }, []);

  const sedesFiltradas = useMemo(() => {
    return searchSedes(sedes, searchQuery);
  }, [sedes, searchQuery]);

  const hasResults = sedesFiltradas.length > 0;
  const showClearButton = searchQuery.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}50)` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${primaryColor}30`, borderTopColor: primaryColor }} />
            <p className="text-gray-600">Cargando sedes...</p>
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
        {/* Hero Section */}
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }} /> 
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative max-w-6xl mx-auto px-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-8 transition-colors group">


            </Link>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                  Nuestras Sedes
                </h1>
                <p className="text-white/90 mt-2 text-lg">
                  {sedes.length} sede{sedes.length !== 1 ? 's' : ''} disponible{sedes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <p className="text-lg text-white/90 max-w-2xl leading-relaxed mb-8">
              Encuentra la sede más cercana y conecta con nosotros para tu formación académica
            </p>

            <div className="relative max-w-xl">
              <div className={`relative flex items-center rounded-2xl transition-all ${searchFocused ? 'ring-2 ring-white/50' : ''}`} style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                <Search className="absolute left-4 w-5 h-5" style={{ color: primaryColor }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, ubicación o coordinador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
                  aria-label="Buscar sedes"
                />
                {showClearButton && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
              
              {/* Resultados en tiempo real */}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/80">
                  {hasResults 
                    ? `${sedesFiltradas.length} resultado${sedesFiltradas.length !== 1 ? 's' : ''}` 
                    : searchQuery ? 'Sin resultados' : `${sedes.length} sedes totales`
                  }
                </span>
                {searchQuery && (
                  <span className="text-white/60">
                    Buscando: "<strong className="text-white">{searchQuery}</strong>"
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sedes Grid */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {!hasResults && searchQuery ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">No se encontraron resultados</h3>
                <p className="text-gray-600 mb-6">Intenta con otros términos de búsqueda</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sedesFiltradas.map((sede, index) => (
                  <Link 
                    key={sede.sede_id} 
                    href={`/sedes/${sede.sede_id}`} 
                    className="group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col" style={{ borderColor: `${primaryColor}20` }}>
                      
                      {/* Imagen */}
                      <div className="relative h-56 overflow-hidden bg-gray-100">
                        {sede.sede_imagen ? (
                          <>
                            <Image
                              src={getStorageUrl(sede.sede_imagen)}
                              alt={sede.sede_nombre}
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
                                    <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}30)">
                                      <svg class="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}20)` }}>
                            <Building2 className="w-16 h-16 text-white/60" />
                          </div>
                        )}
                        
                        {sede.sede_id === 0 && (
                          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm shadow-lg" style={{ color: primaryColor }}>
                            <span className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5" />
                              Principal
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors text-gray-900" style={{ color: primaryColor }}>
                          {sede.sede_nombre}
                        </h3>
                        
                        {sede.sede_coordinador && sede.sede_id !== 0 && (
                          <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                            {sede.sede_coordinador}
                          </p>
                        )}

                        <div className="space-y-3 flex-1">
                          {sede.sede_direccion && (
                            <div className="flex items-start gap-2.5 text-sm">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                              <span className="text-gray-600 line-clamp-2">{sede.sede_direccion}</span>
                            </div>
                          )}
                          {sede.sede_telefono && (
                            <div className="flex items-center gap-2.5 text-sm">
                              <Phone className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                              <span className="text-gray-600">{sede.sede_telefono}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 pt-6 border-t flex items-center justify-between" style={{ borderColor: `${primaryColor}20` }}>
                          <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                            Ver detalles
                          </span>
                          <ArrowLeft className="w-4 h-4 transform rotate-180 group-hover:translate-x-1 transition-transform" style={{ color: primaryColor }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}