import { Database } from '../types';
import { supabase } from '../config/supabase';

export type ConsultationSession = Database['public']['Tables']['consultation_sessions']['Row'];
export type ConsultationSessionInsert = Database['public']['Tables']['consultation_sessions']['Insert'];
export type ConsultationSessionUpdate = Database['public']['Tables']['consultation_sessions']['Update'];

export class ConsultationSessionModel {
  static async create(session: ConsultationSessionInsert): Promise<ConsultationSession | null> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .insert(session)
      .select()
      .single();

    if (error) {
      console.error('Error creating consultation session:', error);
      return null;
    }

    return data;
  }

  static async findById(id: string): Promise<ConsultationSession | null> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .select(`
        *,
        patient:patients(*),
        psychiatrist:users!consultation_sessions_psychiatrist_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error finding consultation session:', error);
      return null;
    }

    return data;
  }

  static async findByPatientId(patientId: string, limit: number = 50): Promise<ConsultationSession[]> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .select(`
        *,
        psychiatrist:users!consultation_sessions_psychiatrist_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('patient_id', patientId)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error finding consultation sessions by patient:', error);
      return [];
    }

    return data || [];
  }

  static async findByPsychiatristId(psychiatristId: string, limit: number = 50): Promise<ConsultationSession[]> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .select(`
        *,
        patient:patients(*)
      `)
      .eq('psychiatrist_id', psychiatristId)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error finding consultation sessions by psychiatrist:', error);
      return [];
    }

    return data || [];
  }

  static async update(id: string, updates: ConsultationSessionUpdate): Promise<ConsultationSession | null> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating consultation session:', error);
      return null;
    }

    return data;
  }

  static async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('consultation_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting consultation session:', error);
      return false;
    }

    return true;
  }

  static async getClinicalSummary(patientId: string): Promise<{
    totalSessions: number;
    lastSessionDate: string | null;
    averageSessionDuration: number;
    commonSymptoms: string[];
    treatmentProgress: string;
  } | null> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .select('symptoms_presented, session_duration_minutes, session_date, treatment_notes')
      .eq('patient_id', patientId)
      .order('session_date', { ascending: false });

    if (error) {
      console.error('Error getting clinical summary:', error);
      return null;
    }

    const sessions = data || [];
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        lastSessionDate: null,
        averageSessionDuration: 0,
        commonSymptoms: [],
        treatmentProgress: 'Sin historial de sesiones'
      };
    }

    // Calcular promedio de duración
    const totalDuration = sessions.reduce((sum, session) => 
      sum + (session.session_duration_minutes || 0), 0
    );
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Obtener síntomas comunes
    const allSymptoms: string[] = [];
    sessions.forEach(session => {
      if (session.symptoms_presented) {
        allSymptoms.push(...session.symptoms_presented);
      }
    });

    const symptomCounts: { [key: string]: number } = {};
    allSymptoms.forEach(symptom => {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
    });

    const commonSymptoms = Object.entries(symptomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symptom]) => symptom);

    // Determinar progreso del tratamiento basado en las últimas notas
    const latestSession = sessions[0];
    let treatmentProgress = 'En evaluación inicial';
    
    if (latestSession?.treatment_notes) {
      const notes = latestSession.treatment_notes.toLowerCase();
      if (notes.includes('mejora') || notes.includes('progreso') || notes.includes('positivo')) {
        treatmentProgress = 'Mostrando mejoría';
      } else if (notes.includes('estable') || notes.includes('controlado')) {
        treatmentProgress = 'Estado estable';
      } else if (notes.includes('empeora') || notes.includes('revisar')) {
        treatmentProgress = 'Requiere ajuste';
      }
    }

    return {
      totalSessions,
      lastSessionDate: sessions[0]?.session_date || null,
      averageSessionDuration: Math.round(averageSessionDuration),
      commonSymptoms,
      treatmentProgress
    };
  }
}