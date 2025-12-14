// Nuevos tipos para Fase 2 - Historial Clínico
export interface ConsultationSession {
  id: string;
  patient_id: string;
  appointment_id?: string;
  psychiatrist_id: string;
  
  // Metadatos
  session_type: 'initial' | 'followup' | 'emergency' | 'review' | 'interconsultation';
  session_date: string;
  duration_minutes: number;
  
  // Datos clínicos estructurados
  clinical_data: ClinicalData;
  
  // Diagnósticos
  primary_diagnosis_code?: string;
  secondary_diagnoses_codes?: string[];
  
  // Plan de tratamiento
  treatment_plan_summary?: string;
  next_session_plan?: string;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  signed_by?: string;
  signed_at?: string;
}

export interface ClinicalData {
  // SECCIÓN INICIAL
  presenting_problem?: string;
  duration_issue?: string;
  triggers_identified?: string;
  previous_treatments?: string;
  
  // EVALUACIÓN PSICOPATOLÓGICA
  mood_assessment?: {
    predominant_mood: 'Depresivo' | 'Ansioso' | 'Mixto' | 'Eutímico' | 'Otro';
    intensity: 'Leve' | 'Moderado' | 'Severo';
    reactivity: 'Reactivo' | 'No reactivo';
    diurnal_variation?: string;
  };
  
  anxiety_symptoms?: {
    generalized?: string;
    panic_attacks?: string;
    phobias?: string;
    ocd_traits?: string;
  };
  
  sleep_pattern?: {
    insomnia_type: 'Inicial' | 'Intermedia' | 'Terminal' | 'Mixta';
    hypersomnia: boolean;
    nightmares?: string;
    restorative: 'Sí' | 'No';
  };
  
  appetite_changes?: string;
  energy_level?: string;
  concentration?: string;
  psychomotor?: string;
  
  // EVALUACIÓN DE RIESGO
  suicide_risk?: {
    ideation: 'Presente' | 'Ausente';
    plan?: string;
    means?: string;
    attempts?: string;
    protective_factors?: string;
  };
  
  self_harm?: string;
  homicidal_ideation?: string;
  
  // FUNCIONAMIENTO GLOBAL
  gaf_score?: number;
  work_functioning?: string;
  social_functioning?: string;
  family_dynamics?: string;
  
  // Observaciones adicionales
  additional_observations?: string;
}

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  psychiatrist_id: string;
  session_id?: string;
  
  // FARMACOTERAPIA
  pharmacotherapy?: {
    rationale?: string;
    target_symptoms?: string;
    medications: Medication[];
  };
  
  // PSICOTERAPIA
  psychotherapy?: {
    modality: 'Cognitiva-Conductual' | 'Interpersonal' | 'Psicodinámica' | 'DBT' | 'ACT' | 'Otro';
    frequency?: string;
    focus_areas?: string;
    homework?: string;
  };
  
  // INTERVENCIONES NO FARMACOLÓGICAS
  lifestyle_interventions?: string[];
  
  // OBJETIVOS ESPECÍFICOS
  short_term_goals?: string;
  mid_term_goals?: string;
  long_term_goals?: string;
  
  // CRITERIOS DE MEJORÍA
  improvement_metrics?: string;
  follow_up_schedule?: string;
  
  created_at: string;
  updated_at: string;
}

export interface Medication {
  name: string;
  dose: string;
  schedule: string;
  duration?: string;
  expected_response?: string;
  monitoring?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface SymptomTracking {
  id: string;
  patient_id: string;
  tracking_date: string;
  symptom_type: string;
  severity: number; // 1-10
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface ClinicalTemplate {
  id: string;
  template_name: string;
  template_type: 'diagnosis' | 'session_type' | 'custom' | 'emergency';
  template_data: any;
  created_by: string;
  is_shared: boolean;
  usage_count: number;
  last_used?: string;
  created_at: string;
}

export interface DiagnosisRecord {
  id: string;
  patient_id: string;
  
  primary_diagnosis: {
    code: string; // CIE-10/DSM-5
    description: string;
    certainty: 'Confirmado' | 'Provisional' | 'Regla de salida';
    date_identified: string;
    date_resolved?: string;
    supporting_evidence: string;
  };
  
  comorbidities: Array<{
    diagnosis: string;
    relationship: 'Primario' | 'Secundario';
    impact: string;
  }>;
  
  differential_diagnoses: Array<{
    diagnosis: string;
    ruled_out_by: string;
    pending_tests: string;
  }>;
  
  created_at: string;
  updated_at: string;
}

// Tipos para formularios de consulta
export interface SessionFormData {
  session_type: string;
  duration_minutes: number;
  clinical_data: Partial<ClinicalData>;
  primary_diagnosis_code?: string;
  secondary_diagnoses_codes?: string[];
  treatment_plan_summary?: string;
  next_session_plan?: string;
}

export interface TreatmentPlanFormData {
  pharmacotherapy?: {
    rationale?: string;
    target_symptoms?: string;
    medications: Omit<Medication, 'start_date' | 'is_active'>[];
  };
  psychotherapy?: {
    modality: string;
    frequency?: string;
    focus_areas?: string;
    homework?: string;
  };
  lifestyle_interventions?: string[];
  short_term_goals?: string;
  mid_term_goals?: string;
  long_term_goals?: string;
  improvement_metrics?: string;
  follow_up_schedule?: string;
}

// Respuestas de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filtros y búsqueda
export interface ClinicalSearchFilters {
  q?: string;
  patient_id?: string;
  psychiatrist_id?: string;
  session_type?: string;
  date_from?: string;
  date_to?: string;
  diagnosis_code?: string;
  symptom_type?: string;
}

// Métricas de seguimiento
export interface ClinicalMetrics {
  session_duration_avg: number;
  patient_improvement_rate: number;
  medication_adherence: number;
  crisis_interventions: number;
  successful_treatments: number;
}