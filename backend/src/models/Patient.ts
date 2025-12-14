import database from '@/config/database';
import { Patient, PatientCreateRequest, PatientUpdateRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { differenceInYears, parseISO } from 'date-fns';

export class PatientModel {
  /**
   * Generar número de historia clínica único
   */
  private static async generateMedicalRecordNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Buscar el último número de secuencia para el año actual
    const query = `
      SELECT medical_record_number
      FROM patients
      WHERE medical_record_number LIKE $1
      ORDER BY medical_record_number DESC
      LIMIT 1
    `;
    
    const result = await database.query(query, [`${currentYear}-%`]);
    
    let nextSequence = 1;
    
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].medical_record_number;
      const lastSequence = parseInt(lastNumber.split('-')[1]);
      nextSequence = lastSequence + 1;
    }
    
    return `${currentYear}-${nextSequence.toString().padStart(3, '0')}`;
  }

  /**
   * Crear nuevo paciente
   */
  static async create(patientData: PatientCreateRequest, createdBy: string): Promise<Patient> {
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      email,
      id_number,
      address,
      emergency_contact,
      emergency_contact_phone,
      insurance_info,
      referring_doctor
    } = patientData;
    
    // Generar ID único y número de historia clínica
    const id = uuidv4();
    const medicalRecordNumber = await this.generateMedicalRecordNumber();
    
    // Validar que la fecha de nacimiento no sea futura
    const birthDate = parseISO(date_of_birth);
    if (birthDate > new Date()) {
      throw new Error('La fecha de nacimiento no puede ser futura');
    }
    
    // Validar rango de edad
    const age = differenceInYears(new Date(), birthDate);
    if (age < 0 || age > 120) {
      throw new Error('La edad debe estar entre 0 y 120 años');
    }
    
    const query = `
      INSERT INTO patients (
        id, medical_record_number, first_name, last_name, date_of_birth, gender,
        phone, email, id_number, address, emergency_contact, emergency_contact_phone,
        insurance_info, referring_doctor, created_by, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `;
    
    const values = [
      id,
      medicalRecordNumber,
      first_name.trim(),
      last_name.trim(),
      date_of_birth,
      gender,
      phone.trim(),
      email?.trim() || null,
      id_number.trim(),
      address?.trim() || null,
      emergency_contact?.trim() || null,
      emergency_contact_phone?.trim() || null,
      insurance_info?.trim() || null,
      referring_doctor?.trim() || null,
      createdBy,
      true // is_active por defecto
    ];
    
    const result = await database.query(query, values);
    return result.rows[0];
  }

  /**
   * Buscar paciente por ID
   */
  static async findById(id: string): Promise<Patient | null> {
    const query = `
      SELECT *
      FROM patients
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await database.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Buscar paciente por número de historia clínica
   */
  static async findByMedicalRecordNumber(medicalRecordNumber: string): Promise<Patient | null> {
    const query = `
      SELECT *
      FROM patients
      WHERE medical_record_number = $1 AND is_active = true
    `;
    
    const result = await database.query(query, [medicalRecordNumber]);
    return result.rows[0] || null;
  }

  /**
   * Buscar paciente por número de identificación
   */
  static async findByIdNumber(idNumber: string): Promise<Patient | null> {
    const query = `
      SELECT *
      FROM patients
      WHERE id_number = $1 AND is_active = true
    `;
    
    const result = await database.query(query, [idNumber]);
    return result.rows[0] || null;
  }

  /**
   * Listar pacientes con paginación y filtros
   */
  static async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    filters?: {
      is_active?: boolean;
      gender?: string;
    }
  ): Promise<{ patients: Patient[], total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE is_active = true';
    const queryParams: any[] = [];
    let paramCount = 1;
    
    // Agregar filtros de búsqueda
    if (search) {
      whereClause += ` AND (
        first_name ILIKE $${paramCount} OR 
        last_name ILIKE $${paramCount} OR 
        medical_record_number ILIKE $${paramCount} OR 
        id_number ILIKE $${paramCount} OR 
        phone ILIKE $${paramCount} OR 
        (email IS NOT NULL AND email ILIKE $${paramCount})
      )`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }
    
    // Filtros adicionales
    if (filters) {
      if (typeof filters.is_active === 'boolean') {
        whereClause += ` AND is_active = $${paramCount}`;
        queryParams.push(filters.is_active);
        paramCount++;
      }
      
      if (filters.gender) {
        whereClause += ` AND gender = $${paramCount}`;
        queryParams.push(filters.gender);
        paramCount++;
      }
    }
    
    const query = `
      SELECT *
      FROM patients
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM patients
      ${whereClause}
    `;
    
    const [patientsResult, countResult] = await Promise.all([
      database.query(query, queryParams),
      database.query(countQuery, queryParams.slice(0, -2)) // Excluir limit y offset del count
    ]);
    
    return {
      patients: patientsResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Buscar pacientes por nombre o número de historia clínica
   */
  static async search(searchTerm: string, limit: number = 10): Promise<Patient[]> {
    const query = `
      SELECT id, medical_record_number, first_name, last_name, date_of_birth, gender, phone, email, is_active
      FROM patients
      WHERE is_active = true AND (
        first_name ILIKE $1 OR 
        last_name ILIKE $1 OR 
        medical_record_number ILIKE $1 OR 
        id_number ILIKE $1 OR 
        phone ILIKE $1 OR 
        (email IS NOT NULL AND email ILIKE $1)
      )
      ORDER BY first_name, last_name
      LIMIT $2
    `;
    
    const result = await database.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  /**
   * Actualizar paciente
   */
  static async update(id: string, updates: PatientUpdateRequest): Promise<Patient | null> {
    const allowedFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email',
      'id_number', 'address', 'emergency_contact', 'emergency_contact_phone',
      'insurance_info', 'referring_doctor', 'is_active'
    ];
    
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    // Construir cláusula SET dinámicamente
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key as keyof PatientUpdateRequest] !== undefined) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(updates[key as keyof PatientUpdateRequest]);
        paramCount++;
      }
    });
    
    if (setClause.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE patients
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND is_active = true
      RETURNING *
    `;
    
    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Desactivar paciente (soft delete)
   */
  static async deactivate(id: string): Promise<boolean> {
    const query = `
      UPDATE patients
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await database.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Activar paciente
   */
  static async activate(id: string): Promise<boolean> {
    const query = `
      UPDATE patients
      SET is_active = true, updated_at = NOW()
      WHERE id = $1 AND is_active = false
    `;
    
    const result = await database.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Verificar si el número de identificación ya existe
   */
  static async idNumberExists(idNumber: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM patients
      WHERE id_number = $1
    `;
    
    const values = [idNumber];
    
    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }
    
    const result = await database.query(query, values);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Obtener estadísticas de pacientes
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_gender: Record<string, number>;
    age_groups: Record<string, number>;
  }> {
    // Estadísticas generales
    const generalQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM patients
    `;
    
    const generalResult = await database.query(generalQuery);
    
    // Estadísticas por género
    const genderQuery = `
      SELECT gender, COUNT(*) as count
      FROM patients
      WHERE is_active = true
      GROUP BY gender
    `;
    
    const genderResult = await database.query(genderQuery);
    
    // Estadísticas por grupo de edad (aproximado)
    const ageQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'Menores de 18'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 30 THEN '18-30'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 31 AND 50 THEN '31-50'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 51 AND 65 THEN '51-65'
          ELSE 'Mayores de 65'
        END as age_group,
        COUNT(*) as count
      FROM patients
      WHERE is_active = true
      GROUP BY age_group
      ORDER BY age_group
    `;
    
    const ageResult = await database.query(ageQuery);
    
    const stats = {
      total: parseInt(generalResult.rows[0].total),
      active: parseInt(generalResult.rows[0].active),
      inactive: parseInt(generalResult.rows[0].inactive),
      by_gender: {} as Record<string, number>,
      age_groups: {} as Record<string, number>
    };
    
    // Procesar resultados por género
    genderResult.rows.forEach(row => {
      stats.by_gender[row.gender] = parseInt(row.count);
    });
    
    // Procesar resultados por grupo de edad
    ageResult.rows.forEach(row => {
      stats.age_groups[row.age_group] = parseInt(row.count);
    });
    
    return stats;
  }

  /**
   * Obtener pacientes con próximas citas
   */
  static async getPatientsWithUpcomingAppointments(psychiatristId: string, days: number = 7): Promise<Patient[]> {
    const query = `
      SELECT DISTINCT p.*
      FROM patients p
      INNER JOIN appointments a ON p.id = a.patient_id
      WHERE p.is_active = true
        AND a.psychiatrist_id = $1
        AND a.appointment_date >= CURRENT_DATE
        AND a.appointment_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND a.status IN ('scheduled', 'confirmed')
      ORDER BY a.appointment_date, a.start_time
      LIMIT 50
    `;
    
    const result = await database.query(query, [psychiatristId]);
    return result.rows;
  }

  /**
   * Obtener citas de un paciente (delegado al modelo Appointment)
   */
  static async findAppointmentsByPatientId(patientId: string, limit: number = 50): Promise<any[]> {
    const { AppointmentModel } = await import('./Appointment');
    return await AppointmentModel.findByPatientId(patientId, limit);
  }
}