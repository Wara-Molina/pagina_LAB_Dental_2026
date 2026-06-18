'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { 
  MapPin, Phone, Mail, Clock, Send, Loader2, ArrowLeft,
  Facebook, Twitter, Instagram, Linkedin, Youtube, CheckCircle, X
} from 'lucide-react';
import Link from 'next/link';

import api from '@/lib/axios';
import { 
  sanitizeText, 
  sanitizeExternalUrl, 
  validateGoogleMapsUrl,
  sanitizeFormInput,
  ClientRateLimiter 
} from '@/lib/security';
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
  institucion_direccion?: string;
  institucion_correo1?: string;
  institucion_correo2?: string;
  institucion_celular1?: number;
  institucion_celular2?: number;
  institucion_telefono1?: number;
  institucion_telefono2?: number;
  institucion_facebook?: string;
  institucion_twitter?: string;
  institucion_youtube?: string;
  institucion_api_google_map?: string;
  institucion_horario_atencion?: string;
  colorinstitucion: ColorInstitucion[];
}

interface FormData {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  website?: string;
}

interface FormErrors {
  nombre?: string;
  email?: string;
  asunto?: string;
  mensaje?: string;
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

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ==================== COMPONENTE PRINCIPAL ====================
function ContactoContent() {
  const institucionId = Number(process.env.NEXT_PUBLIC_INSTITUCION_ID) || 12;
  
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    email: '',
    asunto: '',
    mensaje: '',
    website: '' 
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formFocused, setFormFocused] = useState<string | null>(null);
  const lastSubmitRef = useRef<number>(0);
  
  // Colores dinámicos
  const [primaryColor, setPrimaryColor] = useState('#04246C');
  const [secondaryColor, setSecondaryColor] = useState('#FC0102');
  const [tertiaryColor, setTertiaryColor] = useState('#020733');

  // ==================== FETCH DATOS ====================
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const instRes = await api.get(`/institucionesPrincipal/${institucionId}`);
        const instData = instRes.data.Descripcion;
        
        if (!isMounted) return;
        
        setInstitucion(instData);
        
        if (instData.colorinstitucion?.[0]) {
          setPrimaryColor(getSafeColor(instData.colorinstitucion[0].color_primario, '#04246C'));
          setSecondaryColor(getSafeColor(instData.colorinstitucion[0].color_secundario, '#FC0102'));
          setTertiaryColor(getSafeColor(instData.colorinstitucion[0].color_terciario, '#020733'));
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error cargando contacto:', err);
          setError(process.env.NODE_ENV === 'production' 
            ? 'No se pudieron cargar los datos de contacto.' 
            : 'No se pudieron cargar los datos de contacto.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [institucionId]);

  // ==================== VALIDACIÓN ====================
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    // Honeypot para bots
    if (formData.website && formData.website.trim() !== '') {
      console.warn('Posible bot detectado (honeypot)');
      return false;
    }
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length > 100) {
      errors.nombre = 'El nombre es demasiado largo';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Ingresa un email válido';
    } else if (formData.email.length > 255) {
      errors.email = 'El email es demasiado largo';
    }
    
    if (!formData.asunto.trim()) {
      errors.asunto = 'El asunto es requerido';
    } else if (formData.asunto.length > 200) {
      errors.asunto = 'El asunto es demasiado largo';
    }
    
    if (!formData.mensaje.trim()) {
      errors.mensaje = 'El mensaje es requerido';
    } else if (formData.mensaje.length < 10) {
      errors.mensaje = 'El mensaje debe tener al menos 10 caracteres';
    } else if (formData.mensaje.length > 2000) {
      errors.mensaje = 'El mensaje es demasiado largo';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'mensaje' 
      ? sanitizeFormInput(value, 2000) 
      : sanitizeFormInput(value, 255);
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting
    const clientKey = `contact_form_${institucionId}`;
    if (!ClientRateLimiter.allow(clientKey, 1, 10000)) {
      setError('Por favor espera unos segundos antes de enviar otro mensaje.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // ✅ Simulación de envío (reemplazar con llamada real a tu backend)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Aquí iría la llamada real a tu API:
      // await api.post('/contacto', {
      //   institucion_id: institucionId,
      //   ...formData,
      //   timestamp: new Date().toISOString()
      // });
      
      setSubmitSuccess(true);
      setFormData({ nombre: '', email: '', asunto: '', mensaje: '', website: '' });
      
      // Resetear éxito después de 5 segundos
      setTimeout(() => setSubmitSuccess(false), 5000);
      
    } catch (err: any) {
      console.error('Error enviando formulario:', err);
      setError(process.env.NODE_ENV === 'production'
        ? 'No se pudo enviar el mensaje. Intenta más tarde.'
        : 'Error al enviar el formulario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helpers
  const formatPhone = (phone?: number) => phone ? phone.toString() : null;

  const socialLinks = [
    { name: 'Facebook', url: institucion?.institucion_facebook, icon: Facebook, color: '#1877F2' },
    { name: 'Twitter/X', url: institucion?.institucion_twitter, icon: Twitter, color: '#1DA1F2' },
    { name: 'YouTube', url: institucion?.institucion_youtube, icon: Youtube, color: '#FF0000' },
    { name: 'Instagram', url: null, icon: Instagram, color: '#E4405F' },
    { name: 'LinkedIn', url: null, icon: Linkedin, color: '#0A66C2' },
  ]
    .filter(link => link.url && link.url.trim() !== '')
    .map(link => ({
      ...link,
      safeUrl: sanitizeExternalUrl(link.url, [
        'facebook.com', 'twitter.com', 'x.com', 'youtube.com', 
        'instagram.com', 'linkedin.com', 'youtu.be'
      ])
    }))
    .filter(link => link.safeUrl); 
    
  const safeMapsUrl = validateGoogleMapsUrl(institucion?.institucion_api_google_map);
  
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
            <p className="text-gray-600">Cargando información de contacto...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ==================== RENDER ERROR ====================
  if (error && !submitSuccess) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})` }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
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

              </div>
     </Link>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-xl">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-serif">
                Contáctanos
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-8">
              Estamos aquí para ayudarte. Escríbenos, llámanos o visítanos en{' '}
              <span className="font-semibold text-white">{institucionNombre}</span>
            </p>
            
            {/* Quick Contact Badges */}
            <div className="flex flex-wrap gap-3">
              {institucion?.institucion_celular1 && (
                <a 
                  href={`tel:+591${institucion.institucion_celular1}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-white/25 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +591 {formatPhone(institucion.institucion_celular1)}
                </a>
              )}
              {institucion?.institucion_correo1 && isValidEmail(institucion.institucion_correo1) && (
                <a 
                  href={`mailto:${institucion.institucion_correo1}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-white/25 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {institucion.institucion_correo1}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Success Message */}
        {submitSuccess && (
          <div className="max-w-6xl mx-auto px-4 -mt-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3" role="alert">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">¡Mensaje enviado!</p>
                <p className="text-sm text-green-700">Te responderemos a la brevedad posible.</p>
              </div>
              <button 
                onClick={() => setSubmitSuccess(false)}
                className="ml-auto p-1 rounded-full hover:bg-green-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-green-600" />
              </button>
            </div>
          </div>
        )}

        {/* Content: Contact Info + Form */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
              {/* Columna Izquierda: Info de Contacto */}
           <div className="grid grid-cols-1 xl:grid-cols-7 gap-8">

               <div className="xl:col-span-3">
                {/* Contact Cards */}
                <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                  <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(primaryColor, 0.2)}, transparent)` }}>
                    <div className="p-6 md:p-8">
                      <h2 className="text-2xl font-bold mb-6 text-gray-900">Información de Contacto</h2>
                      
                      <div className="space-y-6">
                        {/* Dirección */}
                        {institucion?.institucion_direccion && (
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                              <MapPin className="w-6 h-6" style={{ color: primaryColor }} />
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1 text-gray-900">Dirección</h3>
                              <p className="text-gray-600 leading-relaxed">
                                {sanitizeText(institucion.institucion_direccion, 300)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Teléfonos */}
                        {(institucion?.institucion_celular1 || institucion?.institucion_telefono1) && (
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(secondaryColor, 0.15)}` }}>
                              <Phone className="w-6 h-6" style={{ color: secondaryColor }} />
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1 text-gray-900">Teléfonos</h3>
                              <div className="space-y-1">
                                {institucion.institucion_celular1 && (
                                  <a 
                                    href={`tel:+591${institucion.institucion_celular1}`}
                                    className="block text-gray-600 hover:underline transition-colors"
                                  >
                                    +591 {formatPhone(institucion.institucion_celular1)}
                                  </a>
                                )}
                                {institucion.institucion_celular2 && institucion.institucion_celular2 !== institucion.institucion_celular1 && (
                                  <a 
                                    href={`tel:+591${institucion.institucion_celular2}`}
                                    className="block text-gray-600 hover:underline transition-colors"
                                  >
                                    +591 {formatPhone(institucion.institucion_celular2)}
                                  </a>
                                )}
                                {institucion.institucion_telefono1 && (
                                  <span className="block text-gray-600">
                                    {institucion.institucion_telefono1}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Emails */}
                        {(institucion?.institucion_correo1 || institucion?.institucion_correo2) && (
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(primaryColor, 0.15)}` }}>
                              <Mail className="w-6 h-6" style={{ color: primaryColor }} />
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1 text-gray-900">Correos Electrónicos</h3>
                              <div className="space-y-1">
                                {institucion.institucion_correo1 && isValidEmail(institucion.institucion_correo1) && (
                                  <a 
                                    href={`mailto:${sanitizeText(institucion.institucion_correo1, 255)}`}
                                    className="block text-gray-600 hover:underline transition-colors"
                                  >
                                    {sanitizeText(institucion.institucion_correo1, 255)}
                                  </a>
                                )}
                                {institucion.institucion_correo2 && 
                                 institucion.institucion_correo2 !== institucion.institucion_correo1 &&
                                 isValidEmail(institucion.institucion_correo2) && (
                                  <a 
                                    href={`mailto:${sanitizeText(institucion.institucion_correo2, 255)}`}
                                    className="block text-gray-600 hover:underline transition-colors"
                                  >
                                    {sanitizeText(institucion.institucion_correo2, 255)}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Horario */}
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${hexToRgba(tertiaryColor, 0.15)}` }}>
                            <Clock className="w-6 h-6" style={{ color: tertiaryColor }} />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1 text-gray-900">Horario de Atención</h3>
                            <p className="text-gray-600">
                              {sanitizeText(institucion?.institucion_horario_atencion || 'Lunes a Viernes: 8:00 - 12:00 y 14:00 - 18:00', 200)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
                
                <div className="xl:col-span-4">
                {/* Map */}
                {safeMapsUrl && (
                  <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                    <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(primaryColor, 0.2)}, transparent)` }}>
                      <div className="p-4 border-b" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                        <h3 className="font-bold flex items-center gap-2 text-gray-900">
                          <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                          Nuestra Ubicación
                        </h3>
                      </div>
                      <iframe
                        src={safeMapsUrl}
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full"
                        title="Ubicación de la institución"
                        sandbox="allow-scripts allow-same-origin"
                      />
                      <div className="p-4 border-t" style={{ borderColor: `${hexToRgba(primaryColor, 0.2)}` }}>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sanitizeText(institucion?.institucion_direccion || '', 200))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 rounded-full font-medium text-white transition-all hover:shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <MapPin className="w-4 h-4" />
                          Cómo llegar con Google Maps
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                </div>

                <div className="xl:col-span-3">
                {/* Social Links */}
                {socialLinks.length > 0 && (
                  <div className="lg:col-span-2 bg-white rounded-2xl border shadow-lg overflow-hidden"
    style={{ borderColor: `${hexToRgba(secondaryColor, 0.2)}` }}>
                    <div className="p-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(secondaryColor, 0.2)}, transparent)` }}>
                      <div className="p-6 md:p-8">
                        <h3 className="text-xl font-bold mb-4 text-gray-900">Síguenos en Redes</h3>
                        <div className="flex flex-wrap gap-3">
                          {socialLinks.map((social) => (
                            <a
                              key={social.name}
                              href={social.safeUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all hover:scale-105 group"
                              title={social.name}
                              style={{ color: social.color }}
                            >
                              <social.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
 
</div>


              </div>

            
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function ContactoPage() {
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
      <ContactoContent />
    </Suspense>
  );
}