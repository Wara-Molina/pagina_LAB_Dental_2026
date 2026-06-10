"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";

import type { AxiosError } from "axios";

import api from "@/lib/axios";

import { getStorageUrl, sanitizeText } from "@/lib/utils";

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

const InstitucionContext = createContext<InstitucionContextType | undefined>(
  undefined,
);

export const InstitucionProvider = ({
  children,
  institucionId,
}: {
  children: ReactNode;

  institucionId: number;
}) => {
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const controller = new AbortController();

    const fetchInstitucion = async () => {
      try {
        if (!Number.isInteger(institucionId) || institucionId <= 0) {
          throw new Error("ID institución inválido");
        }

        setLoading(true);

        setError(null);

        const { data } = await api.get(
          `/institucionesPrincipal/${institucionId}`,
          {
            signal: controller.signal,
          },
        );

        const inst = data?.Descripcion;

        if (!inst) {
          throw new Error("Institución no encontrada");
        }

        if (mounted) {
          setInstitucion({
            ...inst,

            institucion_nombre: sanitizeText(inst.institucion_nombre),

            institucion_iniciales: sanitizeText(inst.institucion_iniciales),

            institucion_logo_url: getStorageUrl(inst.institucion_logo),

            colorinstitucion: Array.isArray(inst.colorinstitucion)
              ? inst.colorinstitucion
              : [],
          });
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        const axiosError = err as AxiosError;

        if (process.env.NODE_ENV !== "production") {
          console.error("Error institución:", axiosError.message);
        }

        if (mounted) {
          setError(axiosError.message || "Error cargando institución");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchInstitucion();

    return () => {
      mounted = false;

      controller.abort();
    };
  }, [institucionId]);

  return (
    <InstitucionContext.Provider
      value={{
        institucion,
        loading,
        error,
      }}
    >
      {children}
    </InstitucionContext.Provider>
  );
};

export const useInstitucion = () => {
  const context = useContext(InstitucionContext);

  if (context === undefined) {
    throw new Error(
      "useInstitucion debe ejecutarse dentro de InstitucionProvider",
    );
  }

  return context;
};
