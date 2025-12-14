import database from '@/config/database';
import { Appointment, AppointmentCreateRequest, AppointmentUpdateRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, addMinutes, isAfter, isBefore, format } from 'date-fns';

export class AppointmentModel {
  /**
   * Crear nueva cita
   */
  static async create(
    appointmentData: AppointmentCreateRequest,
    psychiatristId: string
  ): Promise<Appointment> {
    const {
      patient_id,
      appointment_date,
      start_time,
      duration_minutes,
      type,
      notes
    } = appointmentData;
    
    // Validaciones de negocio
    await this.validateAppointmentData(appointmentData, psychiatristId);
    
    // Generar ID único
    const id = uuidv4();
    
    // Calcular hora de fin
    const startTime = this.parseTime(start_time);
    const endTime = format(addMinutes(startTime, duration_minutes), 'HH:mm');
    
    const query = `
      INSERT INTO appointments (
        id, patient_id, psychiatrist_id, appointment_date, start_time, end_time,
        duration_minutes, type, status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *
    `;
    
    const values = [
      id,
      patient_id,
      psychiatristId,
      appointment_date,
      start_time,
      endTime,
      duration_minutes,
      type,
      'scheduled', // status por defecto
      notes?.trim() || null
    ];
    
    const result = await database.query(query, values);
    return result.rows[0];
  }

  /**
   * Validaciones de negocio para citas
   */
  private static async validateAppointmentData(
    appointmentData: AppointmentCreateRequest,
    psychiatristId: string
  ): Promise<void> {
    const { patient_id, appointment_date, start_time, duration_minutes } = appointmentData;
    
    // 1. Validar que la fecha no sea pasada
    const appointmentDateTime = parseISO(appointment_date);
    if (isBefore(appointmentDateTime, new Date())) {
      throw new Error('No se pueden programar citas en fechas pasadas');
    }
    
    // 2. Validar horario laboral (8:00 - 20:00)
    const startTime = this.parseTime(start_time);
    const workStart = this.parseTime('08:00');
    const workEnd = this.parseTime('20:00');
    
    if (isBefore(startTime, workStart) || isAfter(startTime, workEnd)) {
      throw new Error('Las citas solo se pueden programar entre las 8:00 AM y 8:00 PM');
    }
    
    // 3. Validar duración mínima (15 minutos)
    if (duration_minutes < 15) {
      throw new Error('La duración mínima de una cita es 15 minutos');
    }
    
    // 4. Validar duración máxima (8 horas)
    if (duration_minutes > 480) {
      throw new Error('La duración máxima de una cita es 8 horas');
    }
    
    // 5. Verificar que el paciente existe y está activo
    const patientQuery = `
      SELECT id FROM patients WHERE id = $1 AND is_active = true
    `;
    const patientResult = await database.query(patientQuery, [patient_id]);
    if (patientResult.rows.length === 0) {
      throw new Error('El paciente no existe o está inactivo');
    }
    
    // 6. Verificar conflictos con otras citas del mismo paciente
    const patientConflictQuery = `
      SELECT id FROM appointments
      WHERE patient_id = $1
        AND appointment_date = $2
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
    `;
    
    const endTime = format(addMinutes(startTime, duration_minutes), 'HH:mm');
    const patientConflictResult = await database.query(patientConflictQuery, [
      patient_id,
      appointment_date,
      start_time,
      endTime
    ]);
    
    if (patientConflictResult.rows.length > 0) {
      throw new Error('El paciente ya tiene una cita en ese horario');
    }
    
    // 7. Verificar conflictos con otras citas del mismo psiquiatra
    const psychiatristConflictQuery = `
      SELECT id FROM appointments
      WHERE psychiatrist_id = $1
        AND appointment_date = $2
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
    `;
    
    const psychiatristConflictResult = await database.query(psychiatristConflictQuery, [
      psychiatristId,
      appointment_date,
      start_time,
      endTime
    ]);
    
    if (psychiatristConflictResult.rows.length > 0) {
      throw new Error('El psiquiatra ya tiene una cita en ese horario');
    }
    
    // 8. Validar anticipación mínima (1 hora)
    const timeDiff = appointmentDateTime.getTime() - new Date().getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 1) {
      throw new Error('Las citas deben programarse con al menos 1 hora de anticipación');
    }
  }

  /**
   * Parsear string de tiempo a Date
   */
  private static parseTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Buscar cita por ID
   */
  static async findById(id: string): Promise<Appointment | null> {
    const query = `
      SELECT *
      FROM appointments
      WHERE id = $1
    `;
    
    const result = await database.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Listar citas con filtros y paginación
   */
  static async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      patient_id?: string;
      psychiatrist_id?: string;
      status?: string;
      type?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<{ appointments: Appointment[], total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramCount = 1;
    
    // Agregar filtros
    if (filters) {
      if (filters.patient_id) {
        whereClause += ` AND patient_id = $${paramCount}`;
        queryParams.push(filters.patient_id);
        paramCount++;
      }
      
      if (filters.psychiatrist_id) {
        whereClause += ` AND psychiatrist_id = $${paramCount}`;
        queryParams.push(filters.psychiatrist_id);
        paramCount++;
      }
      
      if (filters.status) {
        whereClause += ` AND status = $${paramCount}`;
        queryParams.push(filters.status);
        paramCount++;
      }
      
      if (filters.type) {
        whereClause += ` AND type = $${paramCount}`;
        queryParams.push(filters.type);
        paramCount++;
      }
      
      if (filters.date_from) {
        whereClause += ` AND appointment_date >= $${paramCount}`;
        queryParams.push(filters.date_from);
        paramCount++;
      }
      
      if (filters.date_to) {
        whereClause += ` AND appointment_date <= $${paramCount}`;
        queryParams.push(filters.date_to);
        paramCount++;
      }
    }
    
    const query = `
      SELECT *
      FROM appointments
      ${whereClause}
      ORDER BY appointment_date DESC, start_time DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM appointments
      ${whereClause}
    `;
    
    const [appointmentsResult, countResult] = await Promise.all([
      database.query(query, queryParams),
      database.query(countQuery, queryParams.slice(0, -2)) // Excluir limit y offset
    ]);
    
    return {
      appointments: appointmentsResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Obtener citas de un paciente
   */
  static async findByPatientId(patientId: string, limit: number = 50): Promise<Appointment[]> {
    const query = `
      SELECT *
      FROM appointments
      WHERE patient_id = $1
      ORDER BY appointment_date DESC, start_time DESC
      LIMIT $2
    `;
    
    const result = await database.query(query, [patientId, limit]);
    return result.rows;
  }

  /**
   * Obtener citas de hoy
   */
  static async findTodayAppointments(psychiatristId?: string): Promise<Appointment[]> {
    let query = `
      SELECT *
      FROM appointments
      WHERE appointment_date = CURRENT_DATE
    `;
    
    const params = [];
    if (psychiatristId) {
      query += ` AND psychiatrist_id = $1`;
      params.push(psychiatristId);
    }
    
    query += ` ORDER BY start_time ASC`;
    
    const result = await database.query(query, params);
    return result.rows;
  }

  /**
   * Obtener próximas citas
   */
  static async findUpcomingAppointments(
    psychiatristId?: string,
    days: number = 7
  ): Promise<Appointment[]> {
    let query = `
      SELECT *
      FROM appointments
      WHERE appointment_date > CURRENT_DATE
        AND appointment_date <= CURRENT_DATE + INTERVAL '${days} days'
    `;
    
    const params = [];
    if (psychiatristId) {
      query += ` AND psychiatrist_id = $1`;
      params.push(psychiatristId);
    }
    
    query += ` AND status IN ('scheduled', 'confirmed')
              ORDER BY appointment_date ASC, start_time ASC
              LIMIT 100`;
    
    const result = await database.query(query, params);
    return result.rows;
  }

  /**
   * Obtener disponibilidad para una fecha específica
   */
  static async getAvailability(
    date: string,
    psychiatristId: string,
    durationMinutes: number = 60
  ): Promise<string[]> {
    // Horario laboral: 8:00 AM - 8:00 PM
    const workStart = 8 * 60; // minutos desde medianoche
    const workEnd = 20 * 60;
    const slotDuration = 30; // slots de 30 minutos
    
    // Obtener citas existentes para esa fecha
    const existingAppointmentsQuery = `
      SELECT start_time, end_time
      FROM appointments
      WHERE appointment_date = $1
        AND psychiatrist_id = $2
        AND status NOT IN ('cancelled', 'no_show')
      ORDER BY start_time
    `;
    
    const existingResult = await database.query(existingAppointmentsQuery, [date, psychiatristId]);
    const existingAppointments = existingResult.rows;
    
    // Generar todos los slots disponibles
    const availableSlots: string[] = [];
    
    for (let start = workStart; start <= workEnd - durationMinutes; start += slotDuration) {
      const slotStart = this.minutesToTime(start);
      const slotEnd = this.minutesToTime(start + durationMinutes);
      
      // Verificar si el slot se superpone con citas existentes
      const hasConflict = existingAppointments.some(appointment => {
        const apptStart = this.timeToMinutes(appointment.start_time);
        const apptEnd = this.timeToMinutes(appointment.end_time);
        
        return (start < apptEnd && (start + durationMinutes) > apptStart);
      });
      
      if (!hasConflict) {
        availableSlots.push(slotStart);
      }
    }
    
    return availableSlots;
  }

  /**
   * Convertir minutos a formato HH:MM
   */
  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Convertir HH:MM a minutos
   */
  private static timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Actualizar cita
   */
  static async update(
    id: string,
    updates: AppointmentUpdateRequest,
    psychiatristId: string
  ): Promise<Appointment | null> {
    const allowedFields = [
      'appointment_date', 'start_time', 'duration_minutes', 'type', 'status', 'notes'
    ];
    
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    // Construir cláusula SET dinámicamente
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key as keyof AppointmentUpdateRequest] !== undefined) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(updates[key as keyof AppointmentUpdateRequest]);
        paramCount++;
      }
    });
    
    if (setClause.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }
    
    // Si se actualiza la fecha, hora o duración, recalcular end_time y validar
    if (updates.appointment_date || updates.start_time || updates.duration_minutes) {
      const appointment = await this.findById(id);
      if (!appointment) {
        throw new Error('Cita no encontrada');
      }
      
      const newDate = updates.appointment_date || appointment.appointment_date;
      const newStartTime = updates.start_time || appointment.start_time;
      const newDuration = updates.duration_minutes || appointment.duration_minutes;
      
      // Validaciones de negocio
      const startTime = this.parseTime(newStartTime);
      const endTime = format(addMinutes(startTime, newDuration), 'HH:mm');
      
      setClause.push(`end_time = $${paramCount}`);
      values.push(endTime);
      paramCount++;
      
      // Validar conflictos (excluyendo la cita actual)
      const conflictQuery = `
        SELECT id FROM appointments
        WHERE id != $1
          AND psychiatrist_id = $2
          AND appointment_date = $3
          AND status NOT IN ('cancelled', 'no_show')
          AND (
            (start_time <= $4 AND end_time > $4) OR
            (start_time < $5 AND end_time >= $5) OR
            (start_time >= $4 AND end_time <= $5)
          )
      `;
      
      const conflictResult = await database.query(conflictQuery, [
        id,
        psychiatristId,
        newDate,
        newStartTime,
        endTime
      ]);
      
      if (conflictResult.rows.length > 0) {
        throw new Error('Conflicto de horario con otra cita');
      }
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE appointments
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND psychiatrist_id = $${paramCount + 1}
      RETURNING *
    `;
    
    values.push(psychiatristId);
    
    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Cambiar estado de cita
   */
  static async updateStatus(
    id: string,
    status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
    psychiatristId: string
  ): Promise<Appointment | null> {
    const query = `
      UPDATE appointments
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND psychiatrist_id = $3
      RETURNING *
    `;
    
    const result = await database.query(query, [status, id, psychiatristId]);
    return result.rows[0] || null;
  }

  /**
   * Eliminar cita
   */
  static async delete(id: string, psychiatristId: string): Promise<boolean> {
    const query = `
      DELETE FROM appointments
      WHERE id = $1 AND psychiatrist_id = $2
    `;
    
    const result = await database.query(query, [id, psychiatristId]);
    return result.rowCount > 0;
  }

  /**
   * Obtener estadísticas de citas
   */
  static async getStats(psychiatristId?: string): Promise<{
    total: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    today: number;
    upcoming: number;
  }> {
    let baseQuery = `
      FROM appointments
    `;
    const params = [];
    
    if (psychiatristId) {
      baseQuery += ` WHERE psychiatrist_id = $1`;
      params.push(psychiatristId);
    }
    
    const queries = [
      // Total
      `SELECT COUNT(*) as total ${baseQuery}`,
      // Por estado
      `SELECT status, COUNT(*) as count ${baseQuery} GROUP BY status`,
      // Citas de hoy
      `SELECT COUNT(*) as today ${baseQuery} ${psychiatristId ? 'AND' : 'WHERE'} appointment_date = CURRENT_DATE`,
      // Próximas citas
      `SELECT COUNT(*) as upcoming ${baseQuery} ${psychiatristId ? 'AND' : 'WHERE'} appointment_date > CURRENT_DATE AND status IN ('scheduled', 'confirmed')`
    ];
    
    const [totalResult, statusResult, todayResult, upcomingResult] = await Promise.all(
      queries.map((query, index) => 
        database.query(query, index === 0 || index === 2 || index === 3 ? params.slice(0, psychiatristId ? 1 : 0) : params)
      )
    );
    
    const stats = {
      total: parseInt(totalResult.rows[0].total),
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      today: parseInt(todayResult.rows[0].today),
      upcoming: parseInt(upcomingResult.rows[0].upcoming)
    };
    
    // Procesar estadísticas por estado
    statusResult.rows.forEach(row => {
      stats[row.status as keyof typeof stats] = parseInt(row.count);
    });
    
    return stats;
  }
}