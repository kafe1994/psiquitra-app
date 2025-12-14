import { Router, Request, Response } from 'express';
import { ConsultationSessionModel } from '../models/ConsultationSession';
import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(auth);

// Esquemas de validación
const createSessionSchema = z.object({
  patient_id: z.string().uuid(),
  psychiatrist_id: z.string().uuid(),
  session_date: z.string().datetime(),
  session_duration_minutes: z.number().min(15).max(240),
  symptoms_presented: z.array(z.string()).optional(),
  clinical_observations: z.string().optional(),
  mental_state_examination: z.object({
    appearance: z.string().optional(),
    behavior: z.string().optional(),
    speech: z.string().optional(),
    mood: z.string().optional(),
    affect: z.string().optional(),
    thought_process: z.string().optional(),
    thought_content: z.string().optional(),
    perception: z.string().optional(),
    cognition: z.string().optional(),
    insight: z.string().optional(),
    judgment: z.string().optional()
  }).optional(),
  treatment_notes: z.string().optional(),
  risk_assessment: z.object({
    suicide_risk: z.enum(['low', 'medium', 'high']).optional(),
    self_care_risk: z.enum(['low', 'medium', 'high']).optional(),
    violence_risk: z.enum(['low', 'medium', 'high']).optional(),
    notes: z.string().optional()
  }).optional(),
  next_session_date: z.string().datetime().optional(),
  session_status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).default('completed')
});

const updateSessionSchema = z.object({
  session_duration_minutes: z.number().min(15).max(240).optional(),
  symptoms_presented: z.array(z.string()).optional(),
  clinical_observations: z.string().optional(),
  mental_state_examination: z.object({
    appearance: z.string().optional(),
    behavior: z.string().optional(),
    speech: z.string().optional(),
    mood: z.string().optional(),
    affect: z.string().optional(),
    thought_process: z.string().optional(),
    thought_content: z.string().optional(),
    perception: z.string().optional(),
    cognition: z.string().optional(),
    insight: z.string().optional(),
    judgment: z.string().optional()
  }).optional(),
  treatment_notes: z.string().optional(),
  risk_assessment: z.object({
    suicide_risk: z.enum(['low', 'medium', 'high']).optional(),
    self_care_risk: z.enum(['low', 'medium', 'high']).optional(),
    violence_risk: z.enum(['low', 'medium', 'high']).optional(),
    notes: z.string().optional()
  }).optional(),
  next_session_date: z.string().datetime().optional(),
  session_status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional()
});

// Rutas

/**
 * @route GET /api/clinical/patients/:patientId/history
 * @desc Obtener historial clínico completo de un paciente
 * @access Private (solo psiquiatras)
 */
router.get('/patients/:patientId/history', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { limit = '50' } = req.query;

    // Verificar que el usuario es psiquiatra
    if (req.user?.role !== 'psychiatrist') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const sessions = await ConsultationSessionModel.findByPatientId(
      patientId, 
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: sessions,
      message: 'Historial clínico obtenido exitosamente'
    });

  } catch (error) {
    console.error('Error getting patient clinical history:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/clinical/patients/:patientId/summary
 * @desc Obtener resumen clínico de un paciente
 * @access Private (solo psiquiatras)
 */
router.get('/patients/:patientId/summary', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Verificar que el usuario es psiquiatra
    if (req.user?.role !== 'psychiatrist') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const summary = await ConsultationSessionModel.getClinicalSummary(patientId);

    if (!summary) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json({
      success: true,
      data: summary,
      message: 'Resumen clínico obtenido exitosamente'
    });

  } catch (error) {
    console.error('Error getting clinical summary:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/clinical/sessions/my-sessions
 * @desc Obtener sesiones del psiquiatra logueado
 * @access Private (solo psiquiatras)
 */
router.get('/sessions/my-sessions', async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;

    // Verificar que el usuario es psiquiatra
    if (req.user?.role !== 'psychiatrist') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const sessions = await ConsultationSessionModel.findByPsychiatristId(
      req.user.id, 
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: sessions,
      message: 'Sesiones obtenidas exitosamente'
    });

  } catch (error) {
    console.error('Error getting psychiatrist sessions:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/clinical/sessions
 * @desc Crear nueva sesión de consulta
 * @access Private (solo psiquiatras)
 */
router.post('/sessions', validateRequest(createSessionSchema), async (req: Request, res: Response) => {
  try {
    const sessionData = req.body;

    // Verificar que el usuario es psiquiatra
    if (req.user?.role !== 'psychiatrist') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    // Asignar el ID del psiquiatra logueado
    sessionData.psychiatrist_id = req.user.id;

    const newSession = await ConsultationSessionModel.create(sessionData);

    if (!newSession) {
      return res.status(400).json({ error: 'Error al crear la sesión' });
    }

    res.status(201).json({
      success: true,
      data: newSession,
      message: 'Sesión de consulta creada exitosamente'
    });

  } catch (error) {
    console.error('Error creating consultation session:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/clinical/sessions/:id
 * @desc Obtener sesión específica por ID
 * @access Private (solo psiquiatras)
 */
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario es psiquiatra
    if (req.user?.role !== 'psychiatrist') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const session = await ConsultationSessionModel.findById(id);

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Verificar que el psiquiatra solo puede ver sus propias sesiones
    if (session.psychiatrist_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso no autorizado a esta sesión' });
    }

    res.json({
      success: true,
      data: session,
      message: 'Sesión obtenida exitosamente'
    });

  } catch (error) {
    console.error('Error getting consultation session:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/clinical/sessions/:id
 * @desc Actualizar sesión de consulta
 * @access Private (solo psiquiatras)
 */
router.put('/sessions/:id', validateRequest(updateSessionSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el usuario es psiquiatra
    if (req.user?.role !== 'psychiatrist') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const existingSession = await ConsultationSessionModel.findById(id);

    if (!existingSession) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Verificar que el psiquiatra solo puede editar sus propias sesiones
    if (existingSession.psychiatrist_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso no autorizado para editar esta sesión' });
    }

    const updatedSession = await ConsultationSessionModel.update(id, updates);

    if (!updatedSession) {
      return res.status(400).json({ error: 'Error al actualizar la sesión' });
    }

    res.json({
      success: true,
      data: updatedSession,
      message: 'Sesión actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error updating consultation session:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/clinical/sessions/:id
 * @desc Eliminar sesión de consulta
 * @access Private (solo psiquiatras y admin)
 */
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario es psiquiatra o admin
    if (req.user?.role !== 'psychiatrist' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const existingSession = await ConsultationSessionModel.findById(id);

    if (!existingSession) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Verificar permisos
    if (existingSession.psychiatrist_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso no autorizado para eliminar esta sesión' });
    }

    const deleted = await ConsultationSessionModel.delete(id);

    if (!deleted) {
      return res.status(400).json({ error: 'Error al eliminar la sesión' });
    }

    res.json({
      success: true,
      message: 'Sesión eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error deleting consultation session:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;