# Laboratorio Dental 2026

Proyecto web desarrollado con Next.js, TypeScript y Tailwind CSS para la gestión y difusión de información institucional, eventos, cursos y publicaciones del laboratorio dental.

## Carrera asociada

Este sistema está orientado a la carrera de:
- Laboratorio Dental

## Descripción

Esta aplicación permite mostrar información relevante, comunicados, eventos, cursos, gacetas, publicaciones y videos institucionales. Incluye páginas públicas, componentes reutilizables y una arquitectura moderna orientada a la escalabilidad y mantenibilidad.

## Estructura del proyecto

- `/app` — Páginas principales y rutas dinámicas
- `/components` — Componentes reutilizables UI y de dominio
- `/context` — Contextos globales de React
- `/hooks` — Hooks personalizados
- `/lib` — Utilidades y helpers
- `/public` — Imágenes y recursos estáticos
- `/styles` — Hojas de estilo globales

## Instalación

```bash
# Clona el repositorio
npm install
# o
pnpm install

# Copia y configura variables de entorno si es necesario
cp .env.copy .env

# Inicia el entorno de desarrollo
npm run dev
```

## Scripts principales

- `npm run dev` — Inicia el servidor en modo desarrollo
- `npm run build` — Compila la aplicación para producción
- `npm run start` — Inicia el servidor en producción
- `npm run lint` — Ejecuta el linter

## Variables de entorno

Ajusta las variables en `.env` según tu entorno. Ejemplo:

```
NEXT_PUBLIC_API_URL=https://api.tu-backend.com
NEXT_PUBLIC_ANALYTICS_ID=xxxxxx
```

## Dependencias clave

- `next` — Framework principal
- `react` y `react-dom` — Librería base
- `tailwindcss` — Estilos utilitarios
- `@radix-ui/*` — Componentes accesibles
- `axios` — Cliente HTTP
- `zod` — Validación de esquemas

## Ejemplo de uso

```bash
# Levantar entorno local
npm run dev
# Accede a http://localhost:3000
```

## Notas adicionales

- El proyecto sigue buenas prácticas de seguridad y performance (CSP, headers, optimización de imágenes).
- Para producción, revisa la configuración en `next.config.mjs` y ajusta los orígenes permitidos.

---

Desarrollado por el equipo UTIC — 2026.
