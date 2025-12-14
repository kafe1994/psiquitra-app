import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest } from '@/types';
import { authService } from '@/api/auth';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Cargar usuario al inicializar la aplicación
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Token inválido, limpiar localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const authData = await authService.login(credentials);
      
      // Guardar tokens
      localStorage.setItem('accessToken', authData.accessToken);
      if (authData.refreshToken) {
        localStorage.setItem('refreshToken', authData.refreshToken);
      }
      
      setUser(authData.user);
      toast.success(`¡Bienvenido, ${authData.user.full_name}!`);
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error?.response?.data?.error?.message || 'Error al iniciar sesión';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const authData = await authService.register(userData);
      
      // Guardar tokens
      localStorage.setItem('accessToken', authData.accessToken);
      if (authData.refreshToken) {
        localStorage.setItem('refreshToken', authData.refreshToken);
      }
      
      setUser(authData.user);
      toast.success(`¡Cuenta creada exitosamente! Bienvenido, ${authData.user.full_name}`);
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error?.response?.data?.error?.message || 'Error al crear la cuenta';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      toast.success('Sesión cerrada exitosamente');
    }
  };

  const updateUser = async (updates: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      toast.success('Perfil actualizado exitosamente');
    } catch (error: any) {
      console.error('Update profile error:', error);
      const message = error?.response?.data?.error?.message || 'Error al actualizar el perfil';
      toast.error(message);
      throw error;
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Refresh auth error:', error);
      // Si falla, limpiar estado de autenticación
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook para verificar si el usuario tiene un rol específico
export const useHasRole = (roles: string | string[]): boolean => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(user.role);
};

// Hook para obtener el nombre del usuario
export const useUserName = (): string => {
  const { user } = useAuth();
  return user?.full_name || 'Usuario';
};

// Hook para verificar si el usuario está autenticado (con redirección automática)
export const useRequireAuth = (): boolean => {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redireccionar al login si no está autenticado
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);
  
  return isAuthenticated;
};