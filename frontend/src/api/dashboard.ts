import apiClient from './client';
import { 
  DashboardStats, 
  PatientsSummary, 
  QuickActions, 
  CalendarData 
} from '@/types';

// Servicio del dashboard
export const dashboardService = {
  // Obtener estadísticas generales del dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
    return response.data;
  },

  // Obtener citas de hoy
  async getTodayAppointments(): Promise<any[]> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>('/dashboard/today-appointments');
    return response.data;
  },

  // Obtener próximas citas
  async getUpcomingAppointments(days: number = 7, limit: number = 20): Promise<any[]> {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: any[] 
    }>(`/dashboard/upcoming?days=${days}&limit=${limit}`);
    return response.data;
  },

  // Obtener resumen de pacientes
  async getPatientsSummary(): Promise<PatientsSummary> {
    const response = await apiClient.get<{ success: boolean; data: PatientsSummary }>('/dashboard/patients-summary');
    return response.data;
  },

  // Obtener acciones rápidas
  async getQuickActions(): Promise<QuickActions> {
    const response = await apiClient.get<{ success: boolean; data: QuickActions }>('/dashboard/quick-actions');
    return response.data;
  },

  // Obtener datos del calendario
  async getCalendarData(year: number, month: number): Promise<CalendarData> {
    const response = await apiClient.get<{ success: boolean; data: CalendarData }>(
      `/dashboard/calendar/${year}/${month}`
    );
    return response.data;
  }
};