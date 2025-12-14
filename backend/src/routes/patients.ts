import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { validate, schemas, validateQuery } from '@/middleware/validation';
import { PatientModel } from '@/models/Patient';
import { createErrorResponse } from '@/middleware/errorHandler';
import { PatientCreateRequest, PatientUpdateRequest, PaginatedResponse, SearchFilters } from '@/types';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /api/v1/patients
 * Listar pacientes con paginación y filtros
 */
router.get('/', 
  validateQuery(schemas.pagination),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.q as string;
      
      // Construir filtros
      const filters: SearchFilters = {};
      
      if (req.query.is_active !== undefined) {
        filters.is_active = req.query.is_active === 'true';
      }
      
      if (req.query.gender) {
        filters.gender = req.query.gender as string;
      }
      
      const { patients, total } = await PatientModel.findAll(page, limit, search, filters);
      
      const response: PaginatedResponse<typeof patients[0]> = {
        data: patients,
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
      console.error('Error listando pacientes:', error);
      res.status(500).json(
        createErrorResponse('FETCH_PATIENTS_ERROR', 'Error al obtener pacientes')
      );
    }
  }
);

/**
 * GET /api/v1/patients/search
 * Búsqueda rápida de pacientes
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json(
        createErrorResponse(
          'INVALID_SEARCH_TERM',
          'El término de búsqueda debe tener al menos 2 caracteres',
          null,
          400
        )
      );
    }
    
    const patients = await PatientModel.search(q, limit);
    
    res.json({
      success: true,
      data: patients
    });
    
  } catch (error) {
    console.error('Error en búsqueda de pacientes:', error);
    res.status(500).json(
      createErrorResponse('SEARCH_PATIENTS_ERROR', 'Error en la búsqueda')
    );
  }
});

/**
 * GET /api/v1/patients/:id
 * Obtener paciente específico
 */
router.get('/:id',
  validateParams(schemas.uuid),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const patient = await PatientModel.findById(id);
      
      if (!patient) {
        return res.status(404).json(
          createErrorResponse(
            'PATIENT_NOT_FOUND',
            'Paciente no encontrado',
            { patientId: id },
            404
          )
        );
      }
      
      res.json({
        success: true,
        data: patient
      });
      
    } catch (error) {
      console.error('Error obteniendo paciente:', error);
      res.status(500).json(
        createErrorResponse('FETCH_PATIENT_ERROR', 'Error al obtener paciente')
      );
    }
  }
);

/**
 * POST /api/v1/patients
 * Crear nuevo paciente
 */
router.post('/',
  validate(schemas.patientCreate),
  async (req: Request, res: Response) => {
    try {
      const patientData: PatientCreateRequest = req.body;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(
            'UNAUTHORIZED',
            'Usuario no autenticado',
            null,
            401
          )
        );
      }
      
      // Verificar que el número de identificación no exista
      const existingPatient = await PatientModel.findByIdNumber(patientData.id_number);
      if (existingPatient) {
        return res.status(409).json(
          createErrorResponse(
            'ID_NUMBER_EXISTS',
            'El número de identificación ya está registrado',
            { idNumber: patientData.id_number },
            409
          )
        );
      }
      
      // Crear paciente
      const newPatient = await PatientModel.create(patientData, userId);
      
      res.status(201).json({
        success: true,
        data: newPatient
      });
      
    } catch (error) {
      console.error('Error creando paciente:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fecha de nacimiento no puede ser futura')) {
          return res.status(422).json(
            createErrorResponse(
              'INVALID_BIRTH_DATE',
              error.message,
              null,
              422
            )
          );
        }
        
        if (error.message.includes('edad debe estar entre')) {
          return res.status(422).json(
            createErrorResponse(
              'INVALID_AGE',
              error.message,
              null,
              422
            )
          );
        }
      }
      
      res.status(500).json(
        createErrorResponse('CREATE_PATIENT_ERROR', 'Error al crear paciente')
      );
    }
  }
);

/**
 * PUT /api/v1/patients/:id
 * Actualizar paciente
 */
router.put('/:id',
  validateParams(schemas.uuid),
  validate(schemas.patientCreate.fork(['first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'id_number'], (schema) => schema.optional())),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: PatientUpdateRequest = req.body;
      
      // Verificar que el paciente existe
      const existingPatient = await PatientModel.findById(id);
      if (!existingPatient) {
        return res.status(404).json(
          createErrorResponse(
            'PATIENT_NOT_FOUND',
            'Paciente no encontrado',
            { patientId: id },
            404
          )
        );
      }
      
      // Si se está actualizando el número de identificación, verificar que no exista
      if (updates.id_number && updates.id_number !== existingPatient.id_number) {
        const duplicatePatient = await PatientModel.findByIdNumber(updates.id_number);
        if (duplicatePatient) {
          return res.status(409).json(
            createErrorResponse(
              'ID_NUMBER_EXISTS',
              'El número de identificación ya está registrado',
              { idNumber: updates.id_number },
              409
            )
          );
        }
      }
      
      // Validar fecha de nacimiento si se está actualizando
      if (updates.date_of_birth) {
        const birthDate = new Date(updates.date_of_birth);
        if (birthDate > new Date()) {
          return res.status(422).json(
            createErrorResponse(
              'INVALID_BIRTH_DATE',
              'La fecha de nacimiento no puede ser futura',
              null,
              422
            )
          );
        }
        
        const age = new Date().getFullYear() - birthDate.getFullYear();
        if (age < 0 || age > 120) {
          return res.status(422).json(
            createErrorResponse(
              'INVALID_AGE',
              'La edad debe estar entre 0 y 120 años',
              null,
              422
            )
          );
        }
      }
      
      const updatedPatient = await PatientModel.update(id, updates);
      
      if (!updatedPatient) {
        return res.status(404).json(
          createErrorResponse(
            'PATIENT_NOT_FOUND',
            'Paciente no encontrado',
            { patientId: id },
            404
          )
        );
      }
      
      res.json({
        success: true,
        data: updatedPatient
      });
      
    } catch (error) {
      console.error('Error actualizando paciente:', error);
      res.status(500).json(
        createErrorResponse('UPDATE_PATIENT_ERROR', 'Error al actualizar paciente')
      );
    }
  }
);

/**
 * DELETE /api/v1/patients/:id
 * Desactivar paciente (soft delete)
 */
router.delete('/:id',
  validateParams(schemas.uuid),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const success = await PatientModel.deactivate(id);
      
      if (!success) {
        return res.status(404).json(
          createErrorResponse(
            'PATIENT_NOT_FOUND',
            'Paciente no encontrado',
            { patientId: id },
            404
          )
        );
      }
      
      res.json({
        success: true,
        data: {
          message: 'Paciente desactivado exitosamente'
        }
      });
      
    } catch (error) {
      console.error('Error desactivando paciente:', error);
      res.status(500).json(
        createErrorResponse('DEACTIVATE_PATIENT_ERROR', 'Error al desactivar paciente')
      );
    }
  }
);

/**
 * PUT /api/v1/patients/:id/activate
 * Activar paciente
 */
router.put('/:id/activate',
  validateParams(schemas.uuid),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const success = await PatientModel.activate(id);
      
      if (!success) {
        return res.status(404).json(
          createErrorResponse(
            'PATIENT_NOT_FOUND',
            'Paciente no encontrado',
            { patientId: id },
            404
          )
        );
      }
      
      res.json({
        success: true,
        data: {
          message: 'Paciente activado exitosamente'
        }
      });
      
    } catch (error) {
      console.error('Error activando paciente:', error);
      res.status(500).json(
        createErrorResponse('ACTIVATE_PATIENT_ERROR', 'Error al activar paciente')
      );
    }
  }
);

/**
 * GET /api/v1/patients/:id/appointments
 * Obtener citas del paciente
 */
router.get('/:id/appointments',
  validateParams(schemas.uuid),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verificar que el paciente existe
      const patient = await PatientModel.findById(id);
      if (!patient) {
        return res.status(404).json(
          createErrorResponse(
            'PATIENT_NOT_FOUND',
            'Paciente no encontrado',
            { patientId: id },
            404
          )
        );
      }
      
      const appointments = await PatientModel.findAppointmentsByPatientId(id, limit);
      
      res.json({
        success: true,
        data: appointments
      });
      
    } catch (error) {
      console.error('Error obteniendo citas del paciente:', error);
      res.status(500).json(
        createErrorResponse('FETCH_PATIENT_APPOINTMENTS_ERROR', 'Error al obtener citas del paciente')
      );
    }
  }
);

// Agregar método findAppointmentsByPatientId al modelo Patient si no existe
if (!PatientModel.findAppointmentsByPatientId) {
  // Este método debería estar en el modelo Appointment, no en Patient
  // Por ahora retornamos un error
  console.warn('Método findAppointmentsByPatientId no encontrado en PatientModel');
}

/**
 * GET /api/v1/patients/stats/summary
 * Obtener resumen de estadísticas de pacientes
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = await PatientModel.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de pacientes:', error);
    res.status(500).json(
      createErrorResponse('FETCH_PATIENTS_STATS_ERROR', 'Error al obtener estadísticas')
    );
  }
});

export default router;