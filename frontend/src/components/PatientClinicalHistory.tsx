import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  FileText, 
  Brain, 
  Heart, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  User,
  Clock,
  Stethoscope,
  Pill,
  Target,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

import { clinicalService } from '@/api/clinical';
import { ConsultationSession, TreatmentPlan, SymptomTracking, DiagnosisRecord } from '@/types/clinical';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PatientClinicalHistoryProps {
  patientId?: string;
}

const PatientClinicalHistory: React.FC<PatientClinicalHistoryProps> = ({ patientId }) => {
  const params = useParams();
  const navigate = useNavigate();
  const activePatientId = patientId || params.patientId;
  
  const [selectedSession, setSelectedSession] = useState<ConsultationSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'treatment' | 'symptoms' | 'diagnoses'>('sessions');
  const [dateRange, setDateRange] = useState('6months'); // 1month, 3months, 6months, 1year

  // Queries para obtener datos
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['patient-sessions', activePatientId, dateRange],
    queryFn: () => clinicalService.sessions.getPatientSessions(activePatientId!, 1, 50),
    enabled: !!activePatientId
  });

  const { data: activeTreatmentPlan } = useQuery({
    queryKey: ['active-treatment-plan', activePatientId],
    queryFn: () => clinicalService.treatment.getActiveTreatmentPlan(activePatientId!),
    enabled: !!activePatientId
  });

  const { data: symptoms } = useQuery({
    queryKey: ['patient-symptoms', activePatientId, 30],
    queryFn: () => clinicalService.symptoms.getPatientSymptoms(activePatientId!, 30),
    enabled: !!activePatientId
  });

  const { data: diagnoses } = useQuery({
    queryKey: ['patient-diagnoses', activePatientId],
    queryFn: () => clinicalService.diagnoses.getPatientDiagnoses(activePatientId!),
    enabled: !!activePatientId
  });

  // Filtrar sesiones por término de búsqueda
  const filteredSessions = sessions?.data.filter(session =>
    session.clinical_data.presenting_problem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.treatment_plan_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.primary_diagnosis_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calcular estadísticas
  const stats = {
    totalSessions: sessions?.pagination.total || 0,
    activeDiagnoses: diagnoses?.filter(d => !d.primary_diagnosis.date_resolved).length || 0,
    currentMedications: activeTreatmentPlan?.pharmacotherapy?.medications.filter(m => m.is_active).length || 0,
    averageSessionDuration: sessions?.data.length ? 
      Math.round(sessions.data.reduce((acc, s) => acc + s.duration_minutes, 0) / sessions.data.length) : 0
  };

  if (!activePatientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecciona un paciente para ver su historial clínico</p>
      </div>
    );
  }

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Cargando historial clínico..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center space-x-3">
              <Brain className="h-8 w-8 text-primary" />
              <span>Historial Clínico</span>
            </h1>
            <p className="text-muted-foreground">
              Seguimiento integral del paciente
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Consulta
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sesiones</p>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Diagnósticos Activos</p>
                  <p className="text-2xl font-bold">{stats.activeDiagnoses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Pill className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medicamentos Activos</p>
                  <p className="text-2xl font-bold">{stats.currentMedications}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duración Promedio</p>
                  <p className="text-2xl font-bold">{stats.averageSessionDuration}min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'sessions', label: 'Sesiones', icon: Stethoscope },
            { id: 'treatment', label: 'Tratamiento', icon: Target },
            { id: 'symptoms', label: 'Síntomas', icon: TrendingUp },
            { id: 'diagnoses', label: 'Diagnósticos', icon: Brain }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'sessions' && (
            <SessionTab 
              sessions={filteredSessions}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedSession={selectedSession}
              onSessionSelect={setSelectedSession}
            />
          )}
          
          {activeTab === 'treatment' && (
            <TreatmentTab treatmentPlan={activeTreatmentPlan} />
          )}
          
          {activeTab === 'symptoms' && (
            <SymptomsTab symptoms={symptoms || []} />
          )}
          
          {activeTab === 'diagnoses' && (
            <DiagnosesTab diagnoses={diagnoses || []} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Información del Paciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Paciente ID</p>
                  <p className="text-sm text-muted-foreground">{activePatientId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Última Consulta</p>
                  <p className="text-sm text-muted-foreground">
                    {sessions?.data[0]?.session_date ? 
                      format(new Date(sessions.data[0].session_date), 'dd MMM yyyy', { locale: es }) :
                      'Sin consultas'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Estado</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-muted-foreground">En tratamiento activo</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sesión
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Pill className="h-4 w-4 mr-2" />
                Ajustar Medicación
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Registrar Síntomas
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                Actualizar Diagnóstico
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Componente para la pestaña de sesiones
const SessionTab: React.FC<{
  sessions: ConsultationSession[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedSession: ConsultationSession | null;
  onSessionSelect: (session: ConsultationSession) => void;
}> = ({ sessions, searchTerm, onSearchChange, selectedSession, onSessionSelect }) => {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar en sesiones clínicas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <Card 
            key={session.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSessionSelect(session)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-1 bg-primary/10 rounded">
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {session.session_type === 'initial' ? 'Evaluación Inicial' :
                         session.session_type === 'followup' ? 'Consulta de Seguimiento' :
                         session.session_type === 'emergency' ? 'Consulta de Emergencia' :
                         session.session_type === 'review' ? 'Revisión de Tratamiento' :
                         'Interconsulta'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.session_date), 'dd MMM yyyy', { locale: es })} • {session.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {session.clinical_data.presenting_problem || 'Sin descripción'}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    {session.primary_diagnosis_code && (
                      <span>DX: {session.primary_diagnosis_code}</span>
                    )}
                    {session.signed_by && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Firmada</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Componente para la pestaña de tratamiento
const TreatmentTab: React.FC<{ treatmentPlan: TreatmentPlan | null }> = ({ treatmentPlan }) => {
  if (!treatmentPlan) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin Plan de Tratamiento</h3>
          <p className="text-muted-foreground mb-4">
            No hay un plan de tratamiento activo para este paciente.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Plan de Tratamiento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen del Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan de Tratamiento Actual</CardTitle>
          <CardDescription>
            Creado el {format(new Date(treatmentPlan.created_at), 'dd MMM yyyy', { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {treatmentPlan.pharmacotherapy && (
            <div className="mb-6">
              <h4 className="font-medium mb-3 flex items-center">
                <Pill className="h-4 w-4 mr-2" />
                Farmacoterapia
              </h4>
              <div className="space-y-3">
                {treatmentPlan.pharmacotherapy.medications.map((med, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{med.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {med.dose} - {med.schedule}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      med.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {med.is_active ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {treatmentPlan.psychotherapy && (
            <div className="mb-6">
              <h4 className="font-medium mb-3 flex items-center">
                <Brain className="h-4 w-4 mr-2" />
                Psicoterapia
              </h4>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p><strong>Modalidad:</strong> {treatmentPlan.psychotherapy.modality}</p>
                {treatmentPlan.psychotherapy.frequency && (
                  <p><strong>Frecuencia:</strong> {treatmentPlan.psychotherapy.frequency}</p>
                )}
                {treatmentPlan.psychotherapy.focus_areas && (
                  <p><strong>Áreas de enfoque:</strong> {treatmentPlan.psychotherapy.focus_areas}</p>
                )}
              </div>
            </div>
          )}
          
          {treatmentPlan.short_term_goals && (
            <div>
              <h4 className="font-medium mb-2">Objetivos a Corto Plazo</h4>
              <p className="text-sm text-muted-foreground">{treatmentPlan.short_term_goals}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para la pestaña de síntomas
const SymptomsTab: React.FC<{ symptoms: SymptomTracking[] }> = ({ symptoms }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Seguimiento de Síntomas</span>
        </CardTitle>
        <CardDescription>
          Últimos 30 días de registro
        </CardDescription>
      </CardHeader>
      <CardContent>
        {symptoms.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay registros de síntomas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {symptoms.slice(0, 10).map((symptom) => (
              <div key={symptom.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{symptom.symptom_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(symptom.tracking_date), 'dd MMM', { locale: es })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-4 rounded ${
                          i < symptom.severity ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{symptom.severity}/10</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente para la pestaña de diagnósticos
const DiagnosesTab: React.FC<{ diagnoses: DiagnosisRecord[] }> = ({ diagnoses }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Historial de Diagnósticos</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {diagnoses.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay diagnósticos registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {diagnoses.map((diagnosis) => (
              <div key={diagnosis.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{diagnosis.primary_diagnosis.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {diagnosis.primary_diagnosis.description}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    diagnosis.primary_diagnosis.certainty === 'Confirmado' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {diagnosis.primary_diagnosis.certainty}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Identificado: {format(new Date(diagnosis.primary_diagnosis.date_identified), 'dd MMM yyyy', { locale: es })}
                </p>
                {diagnosis.primary_diagnosis.date_resolved && (
                  <p className="text-sm text-muted-foreground">
                    Resuelto: {format(new Date(diagnosis.primary_diagnosis.date_resolved), 'dd MMM yyyy', { locale: es })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientClinicalHistory;