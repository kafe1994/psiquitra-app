import apiClient from './client';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse 
} from '@/types';

// Servicio de autenticación
export const authService = {
  // Iniciar sesión
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
    return response.data;
  },

  // Registrar usuario
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', userData);
    return response.data;
  },

  // Cerrar sesión
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    apiClient.clearAuthToken();
  },

  // Obtener datos del usuario actual
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
    return response.data;
  },

  // Actualizar perfil
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await apiClient.put<{ success: boolean; data: User }>('/auth/profile', updates);
    return response.data;
  },

  // Cambiar contraseña
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put('/auth/password', {
      currentPassword,
      newPassword
    });
  },

  // Renovar token
  async refreshToken(): Promise<boolean> {
    return await apiClient.refreshToken();
  }
};