// Tipos de usuario
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'psychiatrist' | 'assistant' | 'admin';
  license_number?: string;
  specialty?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos de autenticación
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

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresIn: string;
}

// Tipos de pacientes
export interface Patient {
  id: string;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PatientCreateRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string;
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

// Tipos de citas
export interface Appointment {
  id: string;
  patient_id: string;
  psychiatrist_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  type: 'consultation' | 'follow_up' | 'emergency' | 'evaluation' | 'therapy' | 'medication_review';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    medical_record_number: string;
    phone: string;
  };
}

export interface AppointmentCreateRequest {
  patient_id: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  type: 'consultation' | 'follow_up' | 'emergency' | 'evaluation' | 'therapy' | 'medication_review';
  notes?: string;
}

export interface AppointmentUpdateRequest extends Partial<AppointmentCreateRequest> {
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
}

// Tipos de respuesta de API
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

// Tipos de estadísticas del dashboard
export interface DashboardStats {
  total_patients: number;
  active_patients: number;
  today_appointments: number;
  pending_appointments: number;
  completed_appointments_today: number;
  upcoming_appointments: number;
  new_patients_this_month: number;
}

export interface PatientsSummary {
  recent_patients: Patient[];
  no_recent_appointments: Patient[];
  pending_confirmations: Patient[];
}

export interface QuickActions {
  pending_confirmations: number;
  patients_no_recent_appointments: number;
  today_appointments_count: number;
  quick_action_suggestions: Array<{
    type: string;
    title: string;
    count: number;
    description: string;
  }>;
}

// Tipos de búsqueda y filtros
export interface SearchFilters {
  q?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
  gender?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Tipos de disponibilidad
export interface AvailabilityResponse {
  date: string;
  duration_minutes: number;
  available_slots: string[];
}

// Tipos de calendario
export interface CalendarAppointment extends Appointment {
  patient: {
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
}

export interface CalendarData {
  year: number;
  month: number;
  appointments: CalendarAppointment[];
}

// Tipos de formularios
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface FormState<T> {
  data: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Tipos de estado de la aplicación
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}

// Tipos de notificaciones
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

// Tipos de configuración
export interface AppConfig {
  apiUrl: string;
  appName: string;
  version: string;
  features: {
    darkMode: boolean;
    notifications: boolean;
    analytics: boolean;
  };
}

// Tipos de validación
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

// Tipos de tema
export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
}

// Tipos de componentes UI
export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

export interface SelectProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  onChange?: (value: string) => void;
}

// Tipos de navegación
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: number;
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}