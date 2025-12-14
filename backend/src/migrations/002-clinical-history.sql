-- Migración 002: Historial Clínico (Fase 2)
-- Fecha: 2025-12-15

-- Tabla de sesiones de consulta (historial clínico)
CREATE TABLE consultation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    psychiatrist_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Información básica de la sesión
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    session_duration_minutes INTEGER NOT NULL CHECK (session_duration_minutes >= 15 AND session_duration_minutes <= 240),
    
    -- Síntomas presentados por el paciente
    symptoms_presented TEXT[], -- Array de síntomas
    
    -- Observaciones clínicas
    clinical_observations TEXT,
    
    -- Examen del estado mental (estructurado)
    mental_state_examination JSONB, -- Objeto con campos estructurados del examen mental
    
    -- Notas de tratamiento
    treatment_notes TEXT,
    
    -- Evaluación de riesgos
    risk_assessment JSONB, -- Objeto con evaluación de riesgos
    
    -- Programación
    next_session_date TIMESTAMP WITH TIME ZONE,
    session_status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (session_status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints adicionales
    CONSTRAINT valid_session_date CHECK (session_date <= NOW()),
    CONSTRAINT valid_next_session CHECK (next_session_date IS NULL OR next_session_date > session_date)
);

-- Índices para optimizar consultas del historial clínico
CREATE INDEX idx_consultation_sessions_patient ON consultation_sessions(patient_id);
CREATE INDEX idx_consultation_sessions_psychiatrist ON consultation_sessions(psychiatrist_id);
CREATE INDEX idx_consultation_sessions_date ON consultation_sessions(session_date);
CREATE INDEX idx_consultation_sessions_status ON consultation_sessions(session_status);
CREATE INDEX idx_consultation_sessions_patient_date ON consultation_sessions(patient_id, session_date DESC);
CREATE INDEX idx_consultation_sessions_psychiatrist_date ON consultation_sessions(psychiatrist_id, session_date DESC);

-- Índice GIN para búsquedas en JSONB (ex INDEX idx_consultation_sessions_amen mental)
CREATE INDEX idx_consultation_sessions_mental_exam ON consultation_sessions USING gin(mental_state_examination);
CREATE INDEX idx_consultation_sessions_risk_assessment ON consultation_sessions USING gin(risk_assessment);

-- Índice GIN para búsquedas en síntomas
CREATE INDEX idx_consultation_sessions_symptoms ON consultation_sessions USING gin(symptoms_presented);

-- Trigger para updated_at
CREATE TRIGGER update_consultation_sessions_updated_at BEFORE UPDATE ON consultation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular resumen clínico
CREATE OR REPLACE FUNCTION get_patient_clinical_summary(patient_uuid UUID)
RETURNS JSON AS $$
DECLARE
    total_sessions_count INTEGER;
    last_session_date_val TIMESTAMP WITH TIME ZONE;
    average_duration NUMERIC;
    common_symptoms_array TEXT[];
    symptom_count INTEGER;
    latest_session_notes TEXT;
    treatment_progress TEXT;
BEGIN
    -- Obtener estadísticas básicas
    SELECT 
        COUNT(*),
        MAX(session_date),
        ROUND(AVG(session_duration_minutes), 2)
    INTO total_sessions_count, last_session_date_val, average_duration
    FROM consultation_sessions 
    WHERE patient_id = patient_uuid;
    
    -- Obtener síntomas más comunes
    SELECT ARRAY_AGG(symptom)
    INTO common_symptoms_array
    FROM (
        SELECT unnest(symptoms_presented) as symptom
        FROM consultation_sessions 
        WHERE patient_id = patient_uuid AND symptoms_presented IS NOT NULL
    ) symptoms
    GROUP BY symptom
    ORDER BY COUNT(*) DESC
    LIMIT 5;
    
    -- Obtener notas de la última sesión para evaluar progreso
    SELECT treatment_notes
    INTO latest_session_notes
    FROM consultation_sessions 
    WHERE patient_id = patient_uuid 
    ORDER BY session_date DESC 
    LIMIT 1;
    
    -- Determinar progreso del tratamiento
    IF latest_session_notes IS NULL THEN
        treatment_progress := 'Sin historial de sesiones';
    ELSE
        IF LOWER(latest_session_notes) LIKE ANY(ARRAY['%mejora%', '%progreso%', '%positivo%']) THEN
            treatment_progress := 'Mostrando mejoría';
        ELSIF LOWER(latest_session_notes) LIKE ANY(ARRAY['%estable%', '%controlado%']) THEN
            treatment_progress := 'Estado estable';
        ELSIF LOWER(latest_session_notes) LIKE ANY(ARRAY['%empeora%', '%revisar%', '%ajustar%']) THEN
            treatment_progress := 'Requiere ajuste';
        ELSE
            treatment_progress := 'En seguimiento';
        END IF;
    END IF;
    
    -- Retornar resumen
    RETURN JSON_BUILD_OBJECT(
        'totalSessions', COALESCE(total_sessions_count, 0),
        'lastSessionDate', last_session_date_val,
        'averageSessionDuration', COALESCE(average_duration, 0),
        'commonSymptoms', COALESCE(common_symptoms_array, ARRAY[]::TEXT[]),
        'treatmentProgress', treatment_progress
    );
END;
$$ LANGUAGE plpgsql;

-- Función para validar que un psiquiatra solo puede acceder a sus propios pacientes
CREATE OR REPLACE FUNCTION validate_psychiatrist_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo psychiatrists y admins pueden crear/editar sesiones
    IF NEW.psychiatrist_id != current_setting('app.current_user_id')::UUID 
       AND current_setting('app.current_user_role') != 'admin' THEN
        RAISE EXCEPTION 'Acceso no autorizado: solo puedes gestionar tus propias sesiones';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validación de acceso
CREATE TRIGGER validate_psychiatrist_access_trigger
    BEFORE INSERT OR UPDATE ON consultation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_psychiatrist_access();

-- Comentarios para documentación
COMMENT ON TABLE consultation_sessions IS 'Sesiones de consulta y historial clínico de pacientes';
COMMENT ON COLUMN consultation_sessions.symptoms_presented IS 'Array de síntomas reportados por el paciente durante la sesión';
COMMENT ON COLUMN consultation_sessions.mental_state_examination IS 'Examen del estado mental estructurado en formato JSON';
COMMENT ON COLUMN consultation_sessions.risk_assessment IS 'Evaluación de riesgos (suicidio, autocuidado, violencia) en formato JSON';
COMMENT ON COLUMN consultation_sessions.treatment_notes IS 'Notas de tratamiento y observaciones clínicas';

-- Comentarios en español para campos específicos del examen mental
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'appearance' IS 'Apariencia general del paciente';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'behavior' IS 'Comportamiento observado durante la sesión';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'speech' IS 'Características del habla (ritmo, tono, volumen)';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'mood' IS 'Estado de ánimo reportado por el paciente';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'affect' IS 'Afecto observado por el clínico';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'thought_process' IS 'Proceso de pensamiento (flujo, coherencia)';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'thought_content' IS 'Contenido del pensamiento (ideas, delirios, obsesiones)';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'perception' IS 'Alteraciones perceptivas (alucinaciones)';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'cognition' IS 'Funciones cognitivas (memoria, atención, orientación)';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'insight' IS 'Capacidad de insight del paciente';
COMMENT ON COLUMN consultation_sessions.mental_state_examination->>'judgment' IS 'Capacidad de juicio';

-- Comentarios para evaluación de riesgos
COMMENT ON COLUMN consultation_sessions.risk_assessment->>'suicide_risk' IS 'Riesgo de suicidio: bajo, medio, alto';
COMMENT ON COLUMN consultation_sessions.risk_assessment->>'self_care_risk' IS 'Riesgo de autocuidado: bajo, medio, alto';
COMMENT ON COLUMN consultation_sessions.risk_assessment->>'violence_risk' IS 'Riesgo de violencia: bajo, medio, alto';
COMMENT ON COLUMN consultation_sessions.risk_assessment->>'notes' IS 'Notas adicionales sobre la evaluación de riesgo';