import apiClient from './client';
import { 
  ConsultationSession, 
  SessionFormData, 
  TreatmentPlan, 
  TreatmentPlanFormData,
  SymptomTracking,
  ClinicalTemplate,
  DiagnosisRecord,
  ClinicalSearchFilters,
  PaginatedResponse,
  ApiResponse
} from '@/types/clinical';

// Servicio de Sesiones de Consulta
export const sessionService = {
  // Crear nueva sesión de consulta
  async createSession(sessionData: SessionFormData): Promise<ConsultationSession> {
    const response = await apiClient.post<ApiResponse<ConsultationSession>>('/sessions', sessionData);
    return response.data!;
  },

  // Obtener sesión por ID
  async getSession(id: string): Promise<ConsultationSession> {
    const response = await apiClient.get<ApiResponse<ConsultationSession>>(`/sessions/${id}`);
    return response.data!;
  },

  // Actualizar sesión
  async updateSession(id: string, updates: Partial<SessionFormData>): Promise<ConsultationSession> {
    const response = await apiClient.put<ApiResponse<ConsultationSession>>(`/sessions/${id}`, updates);
    return response.data!;
  },

  // Obtener historial de sesiones de un paciente
  async getPatientSessions(
    patientId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedResponse<ConsultationSession>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ConsultationSession>>>(
      `/patients/${patientId}/sessions?page=${page}&limit=${limit}`
    );
    return response.data!;
  },

  // Firmar sesión (Dr. Dominicone)
  async signSession(sessionId: string): Promise<void> {
    await apiClient.post(`/sessions/${sessionId}/sign`);
  },

  // Buscar sesiones clínicas
  async searchSessions(filters: ClinicalSearchFilters): Promise<ConsultationSession[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const response = await apiClient.get<ApiResponse<ConsultationSession[]>>(
      `/search/clinical?${params.toString()}`
    );
    return response.data!;
  },

  // Obtener línea de tiempo clínica de un paciente
  async getPatientTimeline(patientId: string): Promise<{
    sessions: ConsultationSession[];
    medications: any[];
    events: any[];
  }> {
    const response = await apiClient.get<ApiResponse<{
    sessions: ConsultationSession[];
    medications: any[];
    events: any[];
  }>>(`/patients/${patientId}/timeline`);
    return response.data!;
  }
};

// Servicio de Planes de Tratamiento
export const treatmentService = {
  // Crear plan de tratamiento
  async createTreatmentPlan(planData: TreatmentPlanFormData & { patient_id: string }): Promise<TreatmentPlan> {
    const response = await apiClient.post<ApiResponse<TreatmentPlan>>('/treatment-plans', planData);
    return response.data!;
  },

  // Obtener plan de tratamiento activo
  async getActiveTreatmentPlan(patientId: string): Promise<TreatmentPlan | null> {
    const response = await apiClient.get<ApiResponse<TreatmentPlan | null>>(
      `/patients/${patientId}/active-treatment-plan`
    );
    return response.data || null;
  },

  // Actualizar plan de tratamiento
  async updateTreatmentPlan(id: string, updates: Partial<TreatmentPlanFormData>): Promise<TreatmentPlan> {
    const response = await apiClient.put<ApiResponse<TreatmentPlan>>(`/treatment-plans/${id}`, updates);
    return response.data!;
  },

  // Obtener historial de planes de tratamiento
  async getTreatmentPlansHistory(patientId: string): Promise<TreatmentPlan[]> {
    const response = await apiClient.get<ApiResponse<TreatmentPlan[]>>(
      `/patients/${patientId}/treatment-plans-history`
    );
    return response.data!;
  },

  // Activar/desactivar medicación
  async toggleMedication(planId: string, medicationIndex: number, isActive: boolean): Promise<TreatmentPlan> {
    const response = await apiClient.put<ApiResponse<TreatmentPlan>>(
      `/treatment-plans/${planId}/medications/${medicationIndex}/toggle`,
      { is_active: isActive }
    );
    return response.data!;
  }
};

// Servicio de Seguimiento de Síntomas
export const symptomTrackingService = {
  // Registrar seguimiento de síntoma
  async trackSymptom(trackingData: Omit<SymptomTracking, 'id' | 'created_at'>): Promise<SymptomTracking> {
    const response = await apiClient.post<ApiResponse<SymptomTracking>>('/symptom-tracking', trackingData);
    return response.data!;
  },

  // Obtener seguimiento de síntomas de un paciente
  async getPatientSymptoms(
    patientId: string, 
    days: number = 30
  ): Promise<SymptomTracking[]> {
    const response = await apiClient.get<ApiResponse<SymptomTracking[]>>(
      `/patients/${patientId}/symptoms?days=${days}`
    );
    return response.data!;
  },

  // Obtener tendencias de síntomas
  async getSymptomTrends(
    patientId: string, 
    symptomType: string, 
    days: number = 30
  ): Promise<{
    dates: string[];
    severities: number[];
    average: number;
    trend: 'improving' | 'stable' | 'worsening';
  }> {
    const response = await apiClient.get<ApiResponse<{
      dates: string[];
      severities: number[];
      average: number;
      trend: 'improving' | 'stable' | 'worsening';
    }>>(
      `/patients/${patientId}/symptoms/${symptomType}/trends?days=${days}`
    );
    return response.data!;
  }
};

// Servicio de Plantillas Clínicas
export const templateService = {
  // Obtener plantillas disponibles
  async getTemplates(type?: string): Promise<ClinicalTemplate[]> {
    const url = type ? `/templates?type=${type}` : '/templates';
    const response = await apiClient.get<ApiResponse<ClinicalTemplate[]>>(url);
    return response.data!;
  },

  // Crear plantilla personalizada
  async createTemplate(templateData: {
    template_name: string;
    template_type: string;
    template_data: any;
  }): Promise<ClinicalTemplate> {
    const response = await apiClient.post<ApiResponse<ClinicalTemplate>>('/templates', templateData);
    return response.data!;
  },

  // Usar plantilla
  async useTemplate(templateId: string, patientId: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`/templates/${templateId}/use`, {
      patient_id: patientId
    });
    return response.data!;
  },

  // Actualizar contador de uso
  async incrementUsage(templateId: string): Promise<void> {
    await apiClient.post(`/templates/${templateId}/use`);
  }
};

// Servicio de Diagnósticos
export const diagnosisService = {
  // Registrar diagnóstico
  async createDiagnosis(diagnosisData: Omit<DiagnosisRecord, 'id' | 'created_at' | 'updated_at'>): Promise<DiagnosisRecord> {
    const response = await apiClient.post<ApiResponse<DiagnosisRecord>>('/diagnoses', diagnosisData);
    return response.data!;
  },

  // Obtener diagnósticos de un paciente
  async getPatientDiagnoses(patientId: string): Promise<DiagnosisRecord[]> {
    const response = await apiClient.get<ApiResponse<DiagnosisRecord[]>>(`/patients/${patientId}/diagnoses`);
    return response.data!;
  },

  // Actualizar diagnóstico
  async updateDiagnosis(id: string, updates: Partial<DiagnosisRecord>): Promise<DiagnosisRecord> {
    const response = await apiClient.put<ApiResponse<DiagnosisRecord>>(`/diagnoses/${id}`, updates);
    return response.data!;
  },

  // Resolver diagnóstico (dar de alta)
  async resolveDiagnosis(id: string, resolutionDate: string): Promise<DiagnosisRecord> {
    const response = await apiClient.put<ApiResponse<DiagnosisRecord>>(`/diagnoses/${id}/resolve`, {
      date_resolved: resolutionDate
    });
    return response.data!;
  },

  // Obtener códigos ICD-10/DSM-5
  async searchDiagnosisCodes(query: string): Promise<Array<{
    code: string;
    description: string;
    category: string;
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      code: string;
      description: string;
      category: string;
    }>>>(`/diagnosis-codes/search?q=${encodeURIComponent(query)}`);
    return response.data!;
  }
};

// Servicio de IA para Resúmenes
export const aiService = {
  // Generar resumen de sesión con IA
  async summarizeSession(sessionId: string): Promise<{
    summary: string;
    key_points: string[];
    recommendations: string[];
    risk_assessment: string;
  }> {
    const response = await apiClient.post<ApiResponse<{
      summary: string;
      key_points: string[];
      recommendations: string[];
      risk_assessment: string;
    }>>('/ai/summarize', { session_id: sessionId });
    return response.data!;
  },

  // Sugerir diagnósticos basados en síntomas
  async suggestDiagnoses(symptoms: string[]): Promise<Array<{
    code: string;
    description: string;
    probability: number;
    rationale: string;
  }>> {
    const response = await apiClient.post<ApiResponse<Array<{
      code: string;
      description: string;
      probability: number;
      rationale: string;
    }>>>('/ai/diagnosis-suggestions', { symptoms });
    return response.data!;
  },

  // Analizar progreso del tratamiento
  async analyzeProgress(patientId: string): Promise<{
    overall_trend: 'improving' | 'stable' | 'worsening';
    improvement_percentage: number;
    key_metrics: {
      mood: number;
      anxiety: number;
      functioning: number;
    };
    recommendations: string[];
  }> {
    const response = await apiClient.post<ApiResponse<{
      overall_trend: 'improving' | 'stable' | 'worsening';
      improvement_percentage: number;
      key_metrics: {
        mood: number;
        anxiety: number;
        functioning: number;
      };
      recommendations: string[];
    }>>('/ai/analyze-progress', { patient_id: patientId });
    return response.data!;
  }
};

// Exportar todos los servicios
export const clinicalService = {
  sessions: sessionService,
  treatment: treatmentService,
  symptoms: symptomTrackingService,
  templates: templateService,
  diagnoses: diagnosisService,
  ai: aiService
};