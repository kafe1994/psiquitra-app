import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { validate, schemas, validateQuery, validateParams } from '@/middleware/validation';
import { AppointmentModel } from '@/models/Appointment';
import { PatientModel } from '@/models/Patient';
import { createErrorResponse } from '@/middleware/errorHandler';
import { AppointmentCreateRequest, AppointmentUpdateRequest, PaginatedResponse } from '@/types';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /api/v1/appointments
 * Listar citas con filtros y paginación
 */
router.get('/',
  validateQuery(schemas.pagination),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      // Construir filtros
      const filters: any = {};
      
      if (req.query.patient_id) {
        filters.patient_id = req.query.patient_id;
      }
      
      if (req.query.psychiatrist_id) {
        filters.psychiatrist_id = req.query.psychiatrist_id;
      }
      
      if (req.query.status) {
        filters.status = req.query.status;
      }
      
      if (req.query.type) {
        filters.type = req.query.type;
      }
      
      if (req.query.date_from) {
        filters.date_from = req.query.date_from;
      }
      
      if (req.query.date_to) {
        filters.date_to = req.query.date_to;
      }
      
      const { appointments, total } = await AppointmentModel.findAll(page, limit, filters);
      
      const response: PaginatedResponse<typeof appointments[0]> = {
        data: appointments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      console.error('Error listando citas:', error);
      res.status(500).json(
        createErrorResponse('FETCH_APPOINTMENTS_ERROR', 'Error al obtener citas')
      );
    }
  }
);

/**
 * GET /api/v1/appointments/today
 * Obtener citas de hoy
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    const appointments = await AppointmentModel.findTodayAppointments(psychiatristId);
    
    res.json({
      success: true,
      data: appointments
    });
    
  } catch (error) {
    console.error('Error obteniendo citas de hoy:', error);
    res.status(500).json(
      createErrorResponse('FETCH_TODAY_APPOINTMENTS_ERROR', 'Error al obtener citas de hoy')
    );
  }
});

/**
 * GET /api/v1/appointments/upcoming
 * Obtener próximas citas
 */
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    const days = parseInt(req.query.days as string) || 7;
    const appointments = await AppointmentModel.findUpcomingAppointments(psychiatristId, days);
    
    res.json({
      success: true,
      data: appointments
    });
    
  } catch (error) {
    console.error('Error obteniendo próximas citas:', error);
    res.status(500).json(
      createErrorResponse('FETCH_UPCOMING_APPOINTMENTS_ERROR', 'Error al obtener próximas citas')
    );
  }
});

/**
 * GET /api/v1/appointments/availability
 * Obtener horarios disponibles para una fecha
 */
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { date, duration } = req.query;
    
    if (!date) {
      return res.status(400).json(
        createErrorResponse(
          'MISSING_DATE',
          'Fecha es requerida',
          null,
          400
        )
      );
    }
    
    const psychiatristId = req.user?.userId;
    const durationMinutes = parseInt(duration as string) || 60;
    
    const availableSlots = await AppointmentModel.getAvailability(
      date as string,
      psychiatristId,
      durationMinutes
    );
    
    res.json({
      success: true,
      data: {
        date,
        duration_minutes: durationMinutes,
        available_slots: availableSlots
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo disponibilidad:', error);
    res.status(500).json(
      createErrorResponse('FETCH_AVAILABILITY_ERROR', 'Error al obtener disponibilidad')
    );
  }
});

/**
 * GET /api/v1/appointments/:id
 * Obtener cita específica
 */
router.get('/:id',
  validateParams(schemas.uuid),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const appointment = await AppointmentModel.findById(id);
      
      if (!appointment) {
        return res.status(404).json(
          createErrorResponse(
            'APPOINTMENT_NOT_FOUND',
            'Cita no encontrada',
            { appointmentId: id },
            404
          )
        );
      }
      
      // Verificar que la cita pertenece al psiquiatra actual (seguridad)
      if (appointment.psychiatrist_id !== req.user?.userId) {
        return res.status(403).json(
          createErrorResponse(
            'INSUFFICIENT_PERMISSIONS',
            'No tiene permisos para ver esta cita',
            null,
            403
          )
        );
      }
      
      res.json({
        success: true,
        data: appointment
      });
      
    } catch (error) {
      console.error('Error obteniendo cita:', error);
      res.status(500).json(
        createErrorResponse('FETCH_APPOINTMENT_ERROR', 'Error al obtener cita')
      );
    }
  }
);

/**
 * POST /api/v1/appointments
 * Crear nueva cita
 */
router.post('/',
  validate(schemas.appointmentCreate),
  async (req: Request, res: Response) => {
    try {
      const appointmentData: AppointmentCreateRequest = req.body;
      const psychiatristId = req.user?.userId;
      
      if (!psychiatristId) {
        return res.status(401).json(
          createErrorResponse(
            'UNAUTHORIZED',
            'Usuario no autenticado',
            null,
            401
          )
        );
      }
      
      // Verificar que el paciente existe
      const patient = await PatientModel.findById(appointmentData.patient_id);
      if (!patient) {
        return res.status(404).json(
          createErrorResponse(
            'PATIENT_NOT_FOUND',
            'Paciente no encontrado',
            { patientId: appointmentData.patient_id },
            404
          )
        );
      }
      
      // Crear cita
      const newAppointment = await AppointmentModel.create(appointmentData, psychiatristId);
      
      res.status(201).json({
        success: true,
        data: newAppointment
      });
      
    } catch (error) {
      console.error('Error creando cita:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('No se pueden programar citas en fechas pasadas')) {
          return res.status(422).json(
            createErrorResponse(
              'PAST_APPOINTMENT_DATE',
              error.message,
              null,
              422
            )
          );
        }
        
        if (error.message.includes('horario laboral')) {
          return res.status(422).json(
            createErrorResponse(
              'INVALID_APPOINTMENT_TIME',
              error.message,
              null,
              422
            )
          );
        }
        
        if (error.message.includes('Conflicto de horario')) {
          return res.status(422).json(
            createErrorResponse(
              'APPOINTMENT_CONFLICT',
              error.message,
              null,
              422
            )
          );
        }
        
        if (error.message.includes('anticipación')) {
          return res.status(422).json(
            createErrorResponse(
              'INSUFFICIENT_ADVANCE_NOTICE',
              error.message,
              null,
              422
            )
          );
        }
      }
      
      res.status(500).json(
        createErrorResponse('CREATE_APPOINTMENT_ERROR', 'Error al crear cita')
      );
    }
  }
);

/**
 * PUT /api/v1/appointments/:id
 * Actualizar cita
 */
router.put('/:id',
  validateParams(schemas.uuid),
  validate(schemas.appointmentCreate.fork(['patient_id'], (schema) => schema.optional())),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: AppointmentUpdateRequest = req.body;
      const psychiatristId = req.user?.userId;
      
      if (!psychiatristId) {
        return res.status(401).json(
          createErrorResponse(
            'UNAUTHORIZED',
            'Usuario no autenticado',
            null,
            401
          )
        );
      }
      
      // Verificar que la cita existe y pertenece al psiquiatra
      const existingAppointment = await AppointmentModel.findById(id);
      if (!existingAppointment) {
        return res.status(404).json(
          createErrorResponse(
            'APPOINTMENT_NOT_FOUND',
            'Cita no encontrada',
            { appointmentId: id },
            404
          )
        );
      }
      
      if (existingAppointment.psychiatrist_id !== psychiatristId) {
        return res.status(403).json(
          createErrorResponse(
            'INSUFFICIENT_PERMISSIONS',
            'No tiene permisos para modificar esta cita',
            null,
            403
          )
        );
      }
      
      const updatedAppointment = await AppointmentModel.update(id, updates, psychiatristId);
      
      if (!updatedAppointment) {
        return res.status(404).json(
          createErrorResponse(
            'APPOINTMENT_NOT_FOUND',
            'Cita no encontrada',
            { appointmentId: id },
            404
          )
        );
      }
      
      res.json({
        success: true,
        data: updatedAppointment
      });
      
    } catch (error) {
      console.error('Error actualizando cita:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Conflicto de horario')) {
          return res.status(422).json(
            createErrorResponse(
              'APPOINTMENT_CONFLICT',
              error.message,
              null,
              422
            )
          );
        }
      }
      
      res.status(500).json(
        createErrorResponse('UPDATE_APPOINTMENT_ERROR', 'Error al actualizar cita')
      );
    }
  }
);

/**
 * PUT /api/v1/appointments/:id/status
 * Cambiar estado de cita
 */
router.put('/:id/status',
  validateParams(schemas.uuid),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const psychiatristId = req.user?.userId;
      
      if (!psychiatristId) {
        return res.status(401).json(
          createErrorResponse(
            'UNAUTHORIZED',
            'Usuario no autenticado',
            null,
            401
          )
        );
      }
      
      if (!status || !['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].includes(status)) {
        return res.status(400).json(
          createErrorResponse(
            'INVALID_STATUS',
            'Estado de cita inválido',
            { status },
            400
          )
        );
      }
      
      // Verificar que la cita existe y pertenece al psiquiatra
      const existingAppointment = await AppointmentModel.findById(id);
      if (!existingAppointment) {
        return res.status(404).json(
          createErrorResponse(
            'APPOINTMENT_NOT_FOUND',
            'Cita no encontrada',
            { appointmentId: id },
            404
          )
        );
      }
      
      if (existingAppointment.psychiatrist_id !== psychiatristId) {
        return res.status(403).json(
          createErrorResponse(
            'INSUFFICIENT_PERMISSIONS',
            'No tiene permisos para modificar esta cita',
            null,
            403
          )
        );
      }
      
      const updatedAppointment = await AppointmentModel.updateStatus(id, status, psychiatristId);
      
      if (!updatedAppointment) {
        return res.status(404).json(
          createErrorResponse(
            'APPOINTMENT_NOT_FOUND',
            'Cita no encontrada',
            { appointmentId: id },
            404
          )
        );
      }
      
      res.json({
        success: true,
        data: updatedAppointment
      });
      
    } catch (error) {
      console.error('Error cambiando estado de cita:', error);
      res.status(500).json(
        createErrorResponse('UPDATE_APPOINTMENT_STATUS_ERROR', 'Error al cambiar estado de cita')
      );
    }
  }
);

/**
 * DELETE /api/v1/appointments/:id
 * Eliminar cita
 */
router.delete('/:id',
  validateParams(schemas.uuid),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const psychiatristId = req.user?.userId;
      
      if (!psychiatristId) {
        return res.status(401).json(
          createErrorResponse(
            'UNAUTHORIZED',
            'Usuario no autenticado',
            null,
            401
          )
        );
      }
      
      // Verificar que la cita existe y pertenece al psiquiatra
      const existingAppointment = await AppointmentModel.findById(id);
      if (!existingAppointment) {
        return res.status(404).json(
          createErrorResponse(
            'APPOINTMENT_NOT_FOUND',
            'Cita no encontrada',
            { appointmentId: id },
            404
          )
        );
      }
      
      if (existingAppointment.psychiatrist_id !== psychiatristId) {
        return res.status(403).json(
          createErrorResponse(
            'INSUFFICIENT_PERMISSIONS',
            'No tiene permisos para eliminar esta cita',
            null,
            403
          )
        );
      }
      
      const success = await AppointmentModel.delete(id, psychiatristId);
      
      if (!success) {
        return res.status(404).json(
          createErrorResponse(
            'APPOINTMENT_NOT_FOUND',
            'Cita no encontrada',
            { appointmentId: id },
            404
          )
        );
      }
      
      res.json({
        success: true,
        data: {
          message: 'Cita eliminada exitosamente'
        }
      });
      
    } catch (error) {
      console.error('Error eliminando cita:', error);
      res.status(500).json(
        createErrorResponse('DELETE_APPOINTMENT_ERROR', 'Error al eliminar cita')
      );
    }
  }
);

/**
 * GET /api/v1/appointments/stats/summary
 * Obtener estadísticas de citas
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const psychiatristId = req.user?.userId;
    const stats = await AppointmentModel.getStats(psychiatristId);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de citas:', error);
    res.status(500).json(
      createErrorResponse('FETCH_APPOINTMENTS_STATS_ERROR', 'Error al obtener estadísticas')
    );
  }
});

export default router;