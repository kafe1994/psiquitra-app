export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'psychiatrist' | 'assistant' | 'admin';
  license_number?: string;
  specialty?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Patient {
  id: string;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: 'M' | 'F' | 'Other' | 'Prefer not to say';
  phone: string;
  email?: string;
  id_number: string;
  address?: string;
  emergency_contact?: string;
  emergency_contact_phone?: string;
  insurance_info?: string;
  referring_doctor?: string;
  is_active: boolean;
  created_by: string; // User ID
  created_at: Date;
  updated_at: Date;
}

export interface Appointment {
  id: string;
  patient_id: string;
  psychiatrist_id: string; // User ID
  appointment_date: Date;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  duration_minutes: number;
  type: 'consultation' | 'follow_up' | 'emergency' | 'evaluation' | 'therapy' | 'medication_review';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  license_number?: string;
  specialty?: string;
}

export interface PatientCreateRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO string
  gender: 'M' | 'F' | 'Other' | 'Prefer not to say';
  phone: string;
  email?: string;
  id_number: string;
  address?: string;
  emergency_contact?: string;
  emergency_contact_phone?: string;
  insurance_info?: string;
  referring_doctor?: string;
}

export interface PatientUpdateRequest extends Partial<PatientCreateRequest> {
  is_active?: boolean;
}

export interface AppointmentCreateRequest {
  patient_id: string;
  appointment_date: string; // ISO string
  start_time: string; // HH:MM format
  duration_minutes: number;
  type: 'consultation' | 'follow_up' | 'emergency' | 'evaluation' | 'therapy' | 'medication_review';
  notes?: string;
}

export interface AppointmentUpdateRequest extends Partial<AppointmentCreateRequest> {
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
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

export interface SearchFilters {
  q?: string; // búsqueda general
  status?: string; // para citas
  type?: string; // para citas
  date_from?: string;
  date_to?: string;
  is_active?: boolean; // para pacientes
  gender?: string; // para pacientes
}

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

export interface DashboardStats {
  total_patients: number;
  active_patients: number;
  today_appointments: number;
  pending_appointments: number;
  completed_appointments_today: number;
  upcoming_appointments: number;
  new_patients_this_month: number;
}

export interface ErrorCode {
  code: string;
  message: string;
  httpStatus: number;
}

// Tipos para el historial clínico (Fase 2)

export interface MentalStateExamination {
  appearance?: string;
  behavior?: string;
  speech?: string;
  mood?: string;
  affect?: string;
  thought_process?: string;
  thought_content?: string;
  perception?: string;
  cognition?: string;
  insight?: string;
  judgment?: string;
}

export interface RiskAssessment {
  suicide_risk?: 'low' | 'medium' | 'high';
  self_care_risk?: 'low' | 'medium' | 'high';
  violence_risk?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface ConsultationSession {
  id: string;
  patient_id: string;
  psychiatrist_id: string;
  session_date: Date;
  session_duration_minutes: number;
  symptoms_presented?: string[];
  clinical_observations?: string;
  mental_state_examination?: MentalStateExamination;
  treatment_notes?: string;
  risk_assessment?: RiskAssessment;
  next_session_date?: Date;
  session_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  created_at: Date;
  updated_at: Date;
  // Relaciones opcionales (cuando se hace JOIN)
  patient?: Patient;
  psychiatrist?: Pick<User, 'id' | 'email' | 'full_name'>;
}

export interface ConsultationSessionCreateRequest {
  patient_id: string;
  session_date: string; // ISO string
  session_duration_minutes: number;
  symptoms_presented?: string[];
  clinical_observations?: string;
  mental_state_examination?: MentalStateExamination;
  treatment_notes?: string;
  risk_assessment?: RiskAssessment;
  next_session_date?: string; // ISO string
  session_status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

export interface ConsultationSessionUpdateRequest {
  session_duration_minutes?: number;
  symptoms_presented?: string[];
  clinical_observations?: string;
  mental_state_examination?: MentalStateExamination;
  treatment_notes?: string;
  risk_assessment?: RiskAssessment;
  next_session_date?: string; // ISO string
  session_status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

export interface ClinicalSummary {
  totalSessions: number;
  lastSessionDate: Date | null;
  averageSessionDuration: number;
  commonSymptoms: string[];
  treatmentProgress: string;
}

export interface PatientClinicalHistory {
  patient: Patient;
  sessions: ConsultationSession[];
  summary: ClinicalSummary;
}

// Tipos para tipos de Supabase (si se usa supabase-js con tipos generados)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      patients: {
        Row: Patient;
        Insert: Omit<Patient, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Patient, 'id' | 'created_at' | 'updated_at'>>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>;
      };
      consultation_sessions: {
        Row: ConsultationSession;
        Insert: Omit<ConsultationSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ConsultationSession, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}