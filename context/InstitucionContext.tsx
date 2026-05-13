// src/context/InstitucionContext.tsx
'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import api from '@/lib/axios'; 
import { getStorageUrl } from '@/lib/utils';

interface ColorInstitucion {
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
}

export interface InstitucionData {
  institucion_id: number;
  institucion_nombre: string;
  institucion_iniciales: string;
  institucion_logo: string;
  institucion_logo_url?: string;
  colorinstitucion: ColorInstitucion[];
}

interface InstitucionContextType {
  institucion: InstitucionData | null;
  loading: boolean;
  error: string | null;
}

const InstitucionContext = createContext<InstitucionContextType | undefined>(undefined);

export const InstitucionProvider = ({ 
  children, 
  institucionId 
}: { 
  children: ReactNode;
  institucionId: number;
}) => {
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstitucion = async () => {
      try {
        setLoading(true);
        setError(null);
 
        const { data } = await api.get(`/institucionesPrincipal/${institucionId}`);
        
        const inst = data.Descripcion;
        
        setInstitucion({
          ...inst,
          institucion_logo_url: getStorageUrl(inst.institucion_logo),
        });
      } catch (err: any) {
        console.error('Error cargando institución:', err);
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    fetchInstitucion();
  }, [institucionId]);

  return (
    <InstitucionContext.Provider value={{ institucion, loading, error }}>
      {children}
    </InstitucionContext.Provider>
  );
};

export const useInstitucion = () => {
  const context = useContext(InstitucionContext);
  if (context === undefined) {
    throw new Error('useInstitucion debe usarse dentro de InstitucionProvider');
  }
  return context;
};