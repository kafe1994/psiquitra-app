-- Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios (psiquiatras)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'psychiatrist' CHECK (role IN ('psychiatrist', 'assistant', 'admin')),
    license_number VARCHAR(50),
    specialty VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de pacientes
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_record_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('M', 'F', 'Other', 'Prefer not to say')),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    id_number VARCHAR(20) NOT NULL,
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    insurance_info TEXT,
    referring_doctor VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de citas
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    psychiatrist_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 480),
    type VARCHAR(30) NOT NULL CHECK (type IN ('consultation', 'follow_up', 'emergency', 'evaluation', 'therapy', 'medication_review')),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraint para prevenir conflictos de horario para el mismo paciente
    CONSTRAINT unique_patient_time_slot EXCLUDE USING gist (
        patient_id WITH =,
        appointment_date WITH =,
        tstzrange(
            (appointment_date + start_time)::timestamptz,
            (appointment_date + end_time)::timestamptz
        ) WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show')),
    -- Constraint para prevenir conflictos de horario para el mismo psiquiatra
    CONSTRAINT unique_psychiatrist_time_slot EXCLUDE USING gist (
        psychiatrist_id WITH =,
        appointment_date WITH =,
        tstzrange(
            (appointment_date + start_time)::timestamptz,
            (appointment_date + end_time)::timestamptz
        ) WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_patients_medical_record ON patients(medical_record_number);
CREATE INDEX idx_patients_id_number ON patients(id_number);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_created_by ON patients(created_by);
CREATE INDEX idx_patients_active ON patients(is_active);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_psychiatrist ON appointments(psychiatrist_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_type ON appointments(type);
CREATE INDEX idx_appointments_date_psychiatrist ON appointments(appointment_date, psychiatrist_id);

-- Crear índices de búsqueda de texto completo (opcional)
CREATE INDEX idx_patients_search ON patients USING gin(
    to_tsvector('spanish', first_name || ' ' || last_name || ' ' || COALESCE(email, '') || ' ' || phone)
);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario administrador por defecto (opcional)
-- Comentado por seguridad, se creará a través de la API
-- INSERT INTO users (email, password_hash, full_name, role, license_number, specialty)
-- VALUES ('admin@psychiatry.com', '$2b$12$...', 'Administrador del Sistema', 'admin', 'ADMIN001', 'Administración');

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Usuarios del sistema (psiquiatras, asistentes, administradores)';
COMMENT ON TABLE patients IS 'Pacientes registrados en el sistema';
COMMENT ON TABLE appointments IS 'Citas programadas entre pacientes y psiquiatras';
COMMENT ON COLUMN users.password_hash IS 'Hash de la contraseña generado con bcrypt';
COMMENT ON COLUMN patients.medical_record_number IS 'Número único de historia clínica (formato: AAAA-###)';
COMMENT ON COLUMN appointments.status IS 'Estado de la cita: programada, confirmada, en progreso, completada, cancelada, no asistió';