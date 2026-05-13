// src/components/CalendarWidget.tsx
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

export interface EventoItem {
  evento_id: number
  evento_titulo?: string 
  evento_fecha?: string
  evento_hora?: string | null
  evento_lugar?: string | null
  evento_imagen?: string | null
  evento_descripcion?: string | null
  tipo_evento?: string | null
  evento_estado?: string | null
}

export interface CalendarWidgetProps {
  colores?: {
    color_primario: string;
    color_secundario: string;
  };
  eventos: EventoItem[];
}

const isValidHexColor = (color: string | undefined): boolean => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getSafeColor = (color: string | undefined, fallback: string): string => {
  return isValidHexColor(color) ? color! : fallback;
};

const parseSafeDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
};

const sanitizeText = (text: string | undefined, maxLength = 200): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[<>\"'&]/g, (char) => ({
      '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
    }[char] || char))
    .trim()
    .slice(0, maxLength);
};

export default function CalendarWidget({ colores, eventos }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const primaryColor = getSafeColor(colores?.color_primario, '#f56224');
  const secondaryColor = getSafeColor(colores?.color_secundario, '#0A02B0');

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const obtenerDiasDelMes = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const obtenerPrimerDiaDelMes = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const eventosProcesados = useMemo(() => {
    return eventos
      .map(evento => ({
        ...evento,
        fechaParsed: parseSafeDate(evento.evento_fecha),
        tituloSanitized: sanitizeText(evento.evento_titulo),
      }))
      .filter(evento => evento.fechaParsed !== null);
  }, [eventos]);

  const tieneEvento = (day: number) => {
    return eventosProcesados.some(evento => {
      if (!evento.fechaParsed) return false;
      return evento.fechaParsed.getDate() === day &&
             evento.fechaParsed.getMonth() === currentDate.getMonth() &&
             evento.fechaParsed.getFullYear() === currentDate.getFullYear();
    });
  };

  const mesActual = useMemo(() => {
    return currentDate.toLocaleDateString('es-BO', { 
      month: 'long', 
      year: 'numeric',
      timeZone: 'UTC'
    });
  }, [currentDate]);

  const diasDelMes = obtenerDiasDelMes(currentDate.getFullYear(), currentDate.getMonth());
  const primerDia = obtenerPrimerDiaDelMes(currentDate.getFullYear(), currentDate.getMonth());

  const mesAnterior = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const mesSiguiente = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const dias = useMemo(() => {

    const result: React.ReactNode[] = [];
    
    for (let i = 0; i < primerDia; i++) {
      result.push(<div key={`empty-${i}`} className="h-10" aria-hidden="true" />);
    }

    for (let day = 1; day <= diasDelMes; day++) {
      const hasEvent = tieneEvento(day);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

      result.push(
        <div
          key={day}
          className={`h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all cursor-default ${
            isToday ? 'ring-2 ring-offset-2' : ''
          } ${
            hasEvent ? 'text-white font-bold' : 'text-gray-700'
          }`}
          style={{
            backgroundColor: hasEvent ? primaryColor : isToday ? 'transparent' : 'transparent',
          }}
          aria-label={hasEvent ? `Día ${day} con evento` : `Día ${day}`}
        >
          {day}
        </div>
      );
    }
    
    return result;
  }, [primerDia, diasDelMes, currentDate, primaryColor, eventosProcesados]);

  return (
    <div role="region" aria-label="Calendario de eventos">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold capitalize" style={{ color: secondaryColor }}>
          {mesActual}
        </h3>
        <div className="flex gap-2" role="navigation" aria-label="Navegación del calendario">
          <button
            onClick={mesAnterior}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: primaryColor }}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={mesSiguiente}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: primaryColor }}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2" role="row">
        {diasSemana.map(dia => (
          <div 
            key={dia} 
            className="h-10 flex items-center justify-center text-xs font-semibold text-gray-500"
            role="columnheader"
            aria-label={dia}
          >
            {dia}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendario de ${mesActual}`}>
        {dias}
      </div>

      <div className="mt-6 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />
          <span className="text-gray-600">Evento</span>
        </div>
      </div>
    </div>
  );
}