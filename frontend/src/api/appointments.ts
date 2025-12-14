import apiClient from './client';
import { 
  Appointment, 
  AppointmentCreateRequest, 
  AppointmentUpdateRequest, 
  PaginatedResponse, 
  SearchFilters, 
  PaginationOptions,
  AvailabilityResponse 
} from '@/types';

// Servicio de citas
export const appointmentService = {
  // Obtener lista de citas con paginación y filtros
  async getAppointments(
    filters?: SearchFilters & PaginationOptions
  ): Promise<PaginatedResponse<Appointment>> {
    const response = await apiClient.get<{ success: boolean; data: PaginatedResponse<Appointment> }>(
      '/appointments',
      filters
    );
    return response.data;
  },

  // Obtener citas de hoy
  async getTodayAppointments(): Promise<Appointment[]> {
    const response = await apiClient.get<{ success: boolean; data: Appointment[] }>('/appointments/today');
    return response.data;
  },

  // Obtener próximas citas
  async getUpcomingAppointments(days: number = 7): Promise<Appointment[]> {
    const response = await apiClient.get<{ success: boolean; data: Appointment[] }>(
      `/appointments/upcoming?days=${days}`
    );
    return response.data;
  },

  // Obtener disponibilidad para una fecha
  async getAvailability(date: string, duration: number = 60): Promise<AvailabilityResponse> {
    const response = await apiClient.get<{ success: boolean; data: AvailabilityResponse }>(
      `/appointments/availability?date=${date}&duration=${duration}`
    );
    return response.data;
  },

  // Obtener cita por ID
  async getAppointment(id: string): Promise<Appointment> {
    const response = await apiClient.get<{ success: boolean; data: Appointment }>(`/appointments/${id}`);
    return response.data;
  },

  // Crear nueva cita
  async createAppointment(appointmentData: AppointmentCreateRequest): Promise<Appointment> {
    const response = await apiClient.post<{ success: boolean; data: Appointment }>(
      '/appointments', 
      appointmentData
    );
    return response.data;
  },

  // Actualizar cita
  async updateAppointment(id: string, updates: AppointmentUpdateRequest): Promise<Appointment> {
    const response = await apiClient.put<{ success: boolean; data: Appointment }>(
      `/appointments/${id}`, 
      updates
    );
    return response.data;
  },

  // Cambiar estado de cita
  async updateAppointmentStatus(
    id: string, 
    status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  ): Promise<Appointment> {
    const response = await apiClient.put<{ success: boolean; data: Appointment }>(
      `/appointments/${id}/status`,
      { status }
    );
    return response.data;
  },

  // Eliminar cita
  async deleteAppointment(id: string): Promise<void> {
    await apiClient.delete(`/appointments/${id}`);
  },

  // Obtener estadísticas de citas
  async getAppointmentStats(): Promise<{
    total: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    today: number;
    upcoming: number;
  }> {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: {
        total: number;
        scheduled: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        today: number;
        upcoming: number;
      }
    }>('/appointments/stats/summary');
    return response.data;
  },

  // Obtener datos del calendario para un mes específico
  async getCalendarData(year: number, month: number): Promise<{
    year: number;
    month: number;
    appointments: any[];
  }> {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: {
        year: number;
        month: number;
        appointments: any[];
      }
    }>(`/dashboard/calendar/${year}/${month}`);
    return response.data;
  }
};