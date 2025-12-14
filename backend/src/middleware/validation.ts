import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
          details,
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
};

// Esquemas de validación comunes
export const schemas = {
  // Autenticación
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email debe tener un formato válido',
      'any.required': 'Email es requerido',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password debe tener al menos 6 caracteres',
      'any.required': 'Password es requerido',
    }),
  }),

  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email debe tener un formato válido',
      'any.required': 'Email es requerido',
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'Password debe tener al menos 8 caracteres',
      'string.pattern.base': 'Password debe contener al menos una minúscula, una mayúscula, un número y un carácter especial',
      'any.required': 'Password es requerido',
    }),
    full_name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nombre completo debe tener al menos 2 caracteres',
      'string.max': 'Nombre completo no puede exceder 100 caracteres',
      'any.required': 'Nombre completo es requerido',
    }),
    license_number: Joi.string().optional(),
    specialty: Joi.string().optional(),
  }),

  // Pacientes
  patientCreate: Joi.object({
    first_name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Nombre debe tener al menos 2 caracteres',
      'string.max': 'Nombre no puede exceder 50 caracteres',
      'any.required': 'Nombre es requerido',
    }),
    last_name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Apellido debe tener al menos 2 caracteres',
      'string.max': 'Apellido no puede exceder 50 caracteres',
      'any.required': 'Apellido es requerido',
    }),
    date_of_birth: Joi.string().isoDate().required().messages({
      'string.isoDate': 'Fecha de nacimiento debe ser una fecha válida',
      'any.required': 'Fecha de nacimiento es requerida',
    }),
    gender: Joi.string().valid('M', 'F', 'Other', 'Prefer not to say').required().messages({
      'any.only': 'Género debe ser: M, F, Other, o Prefer not to say',
      'any.required': 'Género es requerido',
    }),
    phone: Joi.string().pattern(new RegExp('^[+]?[1-9]\\d{1,14}$')).required().messages({
      'string.pattern.base': 'Teléfono debe tener un formato válido',
      'any.required': 'Teléfono es requerido',
    }),
    email: Joi.string().email().optional().messages({
      'string.email': 'Email debe tener un formato válido',
    }),
    id_number: Joi.string().min(6).max(20).required().messages({
      'string.min': 'Número de identificación debe tener al menos 6 caracteres',
      'string.max': 'Número de identificación no puede exceder 20 caracteres',
      'any.required': 'Número de identificación es requerido',
    }),
    address: Joi.string().max(200).optional(),
    emergency_contact: Joi.string().max(100).optional(),
    emergency_contact_phone: Joi.string().pattern(new RegExp('^[+]?[1-9]\\d{1,14}$')).optional().messages({
      'string.pattern.base': 'Teléfono de contacto de emergencia debe tener un formato válido',
    }),
    insurance_info: Joi.string().max(200).optional(),
    referring_doctor: Joi.string().max(100).optional(),
  }),

  // Citas
  appointmentCreate: Joi.object({
    patient_id: Joi.string().uuid().required().messages({
      'string.guid': 'ID de paciente debe ser un UUID válido',
      'any.required': 'ID de paciente es requerido',
    }),
    appointment_date: Joi.string().isoDate().required().messages({
      'string.isoDate': 'Fecha de cita debe ser una fecha válida',
      'any.required': 'Fecha de cita es requerida',
    }),
    start_time: Joi.string().pattern(new RegExp('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')).required().messages({
      'string.pattern.base': 'Hora de inicio debe tener formato HH:MM',
      'any.required': 'Hora de inicio es requerida',
    }),
    duration_minutes: Joi.number().integer().min(15).max(480).required().messages({
      'number.min': 'Duración mínima es 15 minutos',
      'number.max': 'Duración máxima es 8 horas',
      'any.required': 'Duración es requerida',
    }),
    type: Joi.string().valid('consultation', 'follow_up', 'emergency', 'evaluation', 'therapy', 'medication_review').required().messages({
      'any.only': 'Tipo de cita inválido',
      'any.required': 'Tipo de cita es requerido',
    }),
    notes: Joi.string().max(500).optional(),
  }),

  // Paginación
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
  }),

  // UUID
  uuid: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'ID debe ser un UUID válido',
      'any.required': 'ID es requerido',
    }),
  }),
};

// Middleware para validar parámetros de ruta
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'PARAM_VALIDATION_ERROR',
          message: 'Parámetros de ruta inválidos',
          details,
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
};

// Middleware para validar query parameters
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'QUERY_VALIDATION_ERROR',
          message: 'Parámetros de consulta inválidos',
          details,
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
};