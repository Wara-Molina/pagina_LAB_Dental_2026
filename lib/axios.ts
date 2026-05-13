// lib/axios.ts
import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE 
  || process.env.NEXT_PUBLIC_API_ROOT 
  || '';

const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000', 10);
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN?.trim();
if (process.env.NODE_ENV === 'development' && !API_BASE_URL) {
  console.warn('⚠️ NEXT_PUBLIC_API_BASE no configurada. Las peticiones API pueden fallar.');
  console.warn('   Agrega a tu .env.local:');
  console.warn('   NEXT_PUBLIC_API_BASE=https://apiadministrador.upea.bo/api/v2');
}

// ==================== INSTANCIA DE AXIOS ====================

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: API_TIMEOUT,
  withCredentials: false,
  maxRedirects: 3,
  validateStatus: (status) => status >= 200 && status < 300,
});

// ==================== INTERCEPTOR DE SOLICITUD ====================

api.interceptors.request.use(
  (config: any) => {
    if (API_TOKEN && API_TOKEN.length > 0) {
      config.headers.Authorization = `Bearer ${API_TOKEN}`;
    }
    
    if (config.method?.toLowerCase() === 'get') {
      const separator = config.url?.includes('?') ? '&' : '?';
      config.url = `${config.url || ''}${separator}_t=${Date.now()}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error configurando petición:', error.message);
    }
    return Promise.reject(error);
  }
);



// ==================== EXPORT ====================

export default api;
export { API_BASE_URL, API_TIMEOUT };