import apiClient from './client';
import { 
  Patient, 
  PatientCreateRequest, 
  PatientUpdateRequest, 
  PaginatedResponse, 
  SearchFilters, 
  PaginationOptions 
} from '@/types';

// Servicio de pacientes
export const patientService = {
  // Obtener lista de pacientes con paginación y filtros
  async getPatients(
    filters?: SearchFilters & PaginationOptions
  ): Promise<PaginatedResponse<Patient>> {
    const response = await apiClient.get<{ success: boolean; data: PaginatedResponse<Patient> }>(
      '/patients',
      filters
    );
    return response.data;
  },

  // Buscar pacientes
  async searchPatients(query: string, limit: number = 10): Promise<Patient[]> {
    const response = await apiClient.get<{ success: boolean; data: Patient[] }>(
      `/patients/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  },

  // Obtener paciente por ID
  async getPatient(id: string): Promise<Patient> {
    const response = await apiClient.get<{ success: boolean; data: Patient }>(`/patients/${id}`);
    return response.data;
  },

  // Crear nuevo paciente
  async createPatient(patientData: PatientCreateRequest): Promise<Patient> {
    const response = await apiClient.post<{ success: boolean; data: Patient }>('/patients', patientData);
    return response.data;
  },

  // Actualizar paciente
  async updatePatient(id: string, updates: PatientUpdateRequest): Promise<Patient> {
    const response = await apiClient.put<{ success: boolean; data: Patient }>(`/patients/${id}`, updates);
    return response.data;
  },

  // Desactivar paciente
  async deactivatePatient(id: string): Promise<void> {
    await apiClient.delete(`/patients/${id}`);
  },

  // Activar paciente
  async activatePatient(id: string): Promise<void> {
    await apiClient.put(`/patients/${id}/activate`);
  },

  // Obtener citas del paciente
  async getPatientAppointments(id: string, limit: number = 50): Promise<any[]> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
      `/patients/${id}/appointments?limit=${limit}`
    );
    return response.data;
  },

  // Obtener estadísticas de pacientes
  async getPatientStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_gender: Record<string, number>;
    age_groups: Record<string, number>;
  }> {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: {
        total: number;
        active: number;
        inactive: number;
        by_gender: Record<string, number>;
        age_groups: Record<string, number>;
      }
    }>('/patients/stats/summary');
    return response.data;
  }
};