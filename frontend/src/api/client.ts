import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadAuthToken();
  }

  private setupInterceptors(): void {
    // Request interceptor para agregar token de autenticación
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor para manejar errores globalmente
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: AxiosError): void {
    if (!error.response) {
      // Error de red o timeout
      toast.error('Error de conexión. Verifique su conexión a internet.');
      return;
    }

    const { status, data } = error.response;
    const errorMessage = (data as any)?.error?.message || 'Ha ocurrido un error inesperado';

    switch (status) {
      case 401:
        // Token inválido o expirado
        this.handleUnauthorized();
        break;
      case 403:
        toast.error('No tiene permisos para realizar esta acción');
        break;
      case 404:
        toast.error('Recurso no encontrado');
        break;
      case 409:
        toast.error(errorMessage); // Mostrar mensaje específico para conflictos
        break;
      case 422:
        toast.error(errorMessage); // Errores de validación
        break;
      case 429:
        toast.error('Demasiadas solicitudes. Intente de nuevo más tarde');
        break;
      case 500:
        toast.error('Error interno del servidor');
        break;
      default:
        toast.error(errorMessage);
    }
  }

  private handleUnauthorized(): void {
    this.clearAuthToken();
    // Redireccionar al login si no estamos ya ahí
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private loadAuthToken(): void {
    this.authToken = localStorage.getItem('accessToken');
  }

  public setAuthToken(token: string): void {
    this.authToken = token;
    localStorage.setItem('accessToken', token);
  }

  public clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Métodos HTTP
  public async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  public async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  public async delete<T = any>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // Métodos específicos para la aplicación
  public async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await this.post('/auth/refresh', { refreshToken });
      
      if (response.success && response.data.accessToken) {
        this.setAuthToken(response.data.accessToken);
        return true;
      }
      
      return false;
    } catch (error) {
      this.clearAuthToken();
      return false;
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

// Instancia singleton del cliente API
export const apiClient = new ApiClient();

// Funciones de utilidad para la API
export const createQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v.toString()));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });
  
  return searchParams.toString();
};

export const formatApiError = (error: AxiosError): string => {
  if (!error.response) {
    return 'Error de conexión';
  }

  const { data } = error.response;
  return (data as any)?.error?.message || 'Ha ocurrido un error inesperado';
};

// Exportar tipos útiles
export type { AxiosResponse, AxiosError };
export default apiClient;