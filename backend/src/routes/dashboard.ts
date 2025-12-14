import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { createErrorResponse } from '@/middleware/errorHandler';
import { UserModel } from '@/models/User';
import { PatientModel } from '@/models/Patient';
import { AppointmentModel } from '@/models/Appointment';
import { DashboardStats } from '@/types';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /api/v1/dashboard/stats
 * Obtener estadísticas generales del dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    
    // Obtener estadísticas de pacientes
    const patientStats = await PatientModel.getStats();
    
    // Obtener estadísticas de citas
    const appointmentStats = await AppointmentModel.getStats(psychiatristId);
    
    // Calcular citas completadas de hoy
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    const todayCompletedQuery = `
      SELECT COUNT(*) as count
      FROM appointments
      WHERE psychiatrist_id = $1
        AND appointment_date >= $2
        AND appointment_date <= $3
        AND status = 'completed'
    `;
    
    const { AppointmentModel: ApptModel } = await import('@/models/Appointment');
    const db = (ApptModel as any).database || (await import('@/config/database')).default;
    const completedResult = await db.query(todayCompletedQuery, [psychiatristId, todayStart.toISOString().split('T')[0], todayEnd.toISOString().split('T')[0]]);
    const completedToday = parseInt(completedResult.rows[0].count);
    
    // Calcular nuevos pacientes del mes
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    const newPatientsQuery = `
      SELECT COUNT(*) as count
      FROM patients
      WHERE created_by = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    
    const newPatientsResult = await db.query(newPatientsQuery, [psychiatristId, monthStart.toISOString(), monthEnd.toISOString()]);
    const newPatientsThisMonth = parseInt(newPatientsResult.rows[0].count);
    
    const stats: DashboardStats = {
      total_patients: patientStats.total,
      active_patients: patientStats.active,
      today_appointments: appointmentStats.today,
      pending_appointments: appointmentStats.scheduled,
      completed_appointments_today: completedToday,
      upcoming_appointments: appointmentStats.upcoming,
      new_patients_this_month: newPatientsThisMonth
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json(
      createErrorResponse('FETCH_DASHBOARD_STATS_ERROR', 'Error al obtener estadísticas del dashboard')
    );
  }
});

/**
 * GET /api/v1/dashboard/today-appointments
 * Obtener citas de hoy con detalles
 */
router.get('/today-appointments', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    const appointments = await AppointmentModel.findTodayAppointments(psychiatristId);
    
    // Enriquecer con información del paciente
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const patient = await PatientModel.findById(appointment.patient_id);
        return {
          ...appointment,
          patient: patient ? {
            id: patient.id,
            first_name: patient.first_name,
            last_name: patient.last_name,
            medical_record_number: patient.medical_record_number,
            phone: patient.phone
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      data: enrichedAppointments
    });
    
  } catch (error) {
    console.error('Error obteniendo citas de hoy:', error);
    res.status(500).json(
      createErrorResponse('FETCH_TODAY_APPOINTMENTS_ERROR', 'Error al obtener citas de hoy')
    );
  }
});

/**
 * GET /api/v1/dashboard/upcoming
 * Obtener próximas citas (próximos 7 días)
 */
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    const days = parseInt(req.query.days as string) || 7;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const appointments = await AppointmentModel.findUpcomingAppointments(psychiatristId, days);
    
    // Enriquecer con información del paciente y limitar resultados
    const enrichedAppointments = await Promise.all(
      appointments.slice(0, limit).map(async (appointment) => {
        const patient = await PatientModel.findById(appointment.patient_id);
        return {
          ...appointment,
          patient: patient ? {
            id: patient.id,
            first_name: patient.first_name,
            last_name: patient.last_name,
            medical_record_number: patient.medical_record_number,
            phone: patient.phone
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      data: enrichedAppointments
    });
    
  } catch (error) {
    console.error('Error obteniendo próximas citas:', error);
    res.status(500).json(
      createErrorResponse('FETCH_UPCOMING_APPOINTMENTS_ERROR', 'Error al obtener próximas citas')
    );
  }
});

/**
 * GET /api/v1/dashboard/patients-summary
 * Resumen de pacientes
 */
router.get('/patients-summary', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    
    // Pacientes recientes (últimos 10)
    const recentPatientsQuery = `
      SELECT p.*
      FROM patients p
      WHERE p.created_by = $1 AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    
    const { AppointmentModel: ApptModel } = await import('@/models/Appointment');
    const db = (ApptModel as any).database || (await import('@/config/database')).default;
    
    const recentPatientsResult = await db.query(recentPatientsQuery, [psychiatristId]);
    const recentPatients = recentPatientsResult.rows;
    
    // Pacientes sin cita reciente (más de 30 días)
    const noRecentAppointmentsQuery = `
      SELECT DISTINCT p.*
      FROM patients p
      WHERE p.created_by = $1
        AND p.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.patient_id = p.id
            AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
        )
      ORDER BY p.updated_at DESC
      LIMIT 10
    `;
    
    const noRecentAppointmentsResult = await db.query(noRecentAppointmentsQuery, [psychiatristId]);
    const noRecentAppointments = noRecentAppointmentsResult.rows;
    
    // Pacientes con citas pendientes de confirmación
    const pendingConfirmationsQuery = `
      SELECT DISTINCT p.*
      FROM patients p
      INNER JOIN appointments a ON p.id = a.patient_id
      WHERE a.psychiatrist_id = $1
        AND a.status = 'scheduled'
        AND a.appointment_date >= CURRENT_DATE
      ORDER BY a.appointment_date, a.start_time
      LIMIT 10
    `;
    
    const pendingConfirmationsResult = await db.query(pendingConfirmationsQuery, [psychiatristId]);
    const pendingConfirmations = pendingConfirmationsResult.rows;
    
    res.json({
      success: true,
      data: {
        recent_patients: recentPatients,
        no_recent_appointments: noRecentAppointments,
        pending_confirmations: pendingConfirmations
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo resumen de pacientes:', error);
    res.status(500).json(
      createErrorResponse('FETCH_PATIENTS_SUMMARY_ERROR', 'Error al obtener resumen de pacientes')
    );
  }
});

/**
 * GET /api/v1/dashboard/calendar/:year/:month
 * Obtener citas del calendario para un mes específico
 */
router.get('/calendar/:year/:month', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const psychiatristId = req.user?.userId;
    
    // Validar parámetros
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json(
        createErrorResponse(
          'INVALID_CALENDAR_PARAMS',
          'Año y mes deben ser números válidos',
          { year, month },
          400
        )
      );
    }
    
    // Construir fechas de inicio y fin del mes
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // Último día del mes
    
    const appointmentsQuery = `
      SELECT a.*, p.first_name, p.last_name, p.medical_record_number
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE a.psychiatrist_id = $1
        AND a.appointment_date >= $2
        AND a.appointment_date <= $3
      ORDER BY a.appointment_date, a.start_time
    `;
    
    const { AppointmentModel: ApptModel } = await import('@/models/Appointment');
    const db = (ApptModel as any).database || (await import('@/config/database')).default;
    
    const appointmentsResult = await db.query(appointmentsQuery, [
      psychiatristId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ]);
    
    const appointments = appointmentsResult.rows.map(row => ({
      id: row.id,
      appointment_date: row.appointment_date,
      start_time: row.start_time,
      end_time: row.end_time,
      duration_minutes: row.duration_minutes,
      type: row.type,
      status: row.status,
      notes: row.notes,
      patient: {
        id: row.patient_id,
        first_name: row.first_name,
        last_name: row.last_name,
        medical_record_number: row.medical_record_number
      }
    }));
    
    res.json({
      success: true,
      data: {
        year: yearNum,
        month: monthNum,
        appointments
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo calendario:', error);
    res.status(500).json(
      createErrorResponse('FETCH_CALENDAR_ERROR', 'Error al obtener datos del calendario')
    );
  }
});

/**
 * GET /api/v1/dashboard/quick-actions
 * Obtener acciones rápidas disponibles
 */
router.get('/quick-actions', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    
    // Citas que necesitan confirmación
    const pendingConfirmationsQuery = `
      SELECT COUNT(*) as count
      FROM appointments
      WHERE psychiatrist_id = $1
        AND status = 'scheduled'
        AND appointment_date >= CURRENT_DATE
    `;
    
    const { AppointmentModel: ApptModel } = await import('@/models/Appointment');
    const db = (ApptModel as any).database || (await import('@/config/database')).default;
    
    const pendingResult = await db.query(pendingConfirmationsQuery, [psychiatristId]);
    const pendingConfirmations = parseInt(pendingResult.rows[0].count);
    
    // Pacientes sin cita reciente
    const noRecentAppointmentsQuery = `
      SELECT COUNT(*) as count
      FROM patients p
      WHERE p.created_by = $1
        AND p.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.patient_id = p.id
            AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
        )
    `;
    
    const noRecentResult = await db.query(noRecentAppointmentsQuery, [psychiatristId]);
    const noRecentAppointments = parseInt(noRecentResult.rows[0].count);
    
    // Citas de hoy
    const todayAppointments = await AppointmentModel.findTodayAppointments(psychiatristId);
    
    res.json({
      success: true,
      data: {
        pending_confirmations: pendingConfirmations,
        patients_no_recent_appointments: noRecentAppointments,
        today_appointments_count: todayAppointments.length,
        quick_action_suggestions: [
          {
            type: 'confirm_appointments',
            title: 'Confirmar citas pendientes',
            count: pendingConfirmations,
            description: `${pendingConfirmations} citas necesitan confirmación`
          },
          {
            type: 'follow_up_patients',
            title: 'Seguimiento de pacientes',
            count: noRecentAppointments,
            description: `${noRecentAppointments} pacientes sin cita reciente`
          },
          {
            type: 'today_appointments',
            title: 'Citas de hoy',
            count: todayAppointments.length,
            description: `${todayAppointments.length} citas programadas para hoy`
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo acciones rápidas:', error);
    res.status(500).json(
      createErrorResponse('FETCH_QUICK_ACTIONS_ERROR', 'Error al obtener acciones rápidas')
    );
  }
});

export default router;