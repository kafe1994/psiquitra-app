import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ErrorCode } from '@/types';

// Códigos de error predefinidos
export const ERROR_CODES: Record<string, ErrorCode> = {
  // Errores de autenticación
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'No autorizado',
    httpStatus: 401,
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Token inválido o expirado',
    httpStatus: 403,
  },
  ACCESS_TOKEN_REQUIRED: {
    code: 'ACCESS_TOKEN_REQUIRED',
    message: 'Token de acceso requerido',
    httpStatus: 401,
  },

  // Errores de validación
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Datos de entrada inválidos',
    httpStatus: 400,
  },
  PARAM_VALIDATION_ERROR: {
    code: 'PARAM_VALIDATION_ERROR',
    message: 'Parámetros de ruta inválidos',
    httpStatus: 400,
  },
  QUERY_VALIDATION_ERROR: {
    code: 'QUERY_VALIDATION_ERROR',
    message: 'Parámetros de consulta inválidos',
    httpStatus: 400,
  },

  // Errores de recursos
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'Usuario no encontrado',
    httpStatus: 404,
  },
  PATIENT_NOT_FOUND: {
    code: 'PATIENT_NOT_FOUND',
    message: 'Paciente no encontrado',
    httpStatus: 404,
  },
  APPOINTMENT_NOT_FOUND: {
    code: 'APPOINTMENT_NOT_FOUND',
    message: 'Cita no encontrada',
    httpStatus: 404,
  },

  // Errores de duplicación
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'El email ya está registrado',
    httpStatus: 409,
  },
  MEDICAL_RECORD_NUMBER_EXISTS: {
    code: 'MEDICAL_RECORD_NUMBER_EXISTS',
    message: 'El número de historia clínica ya existe',
    httpStatus: 409,
  },
  ID_NUMBER_EXISTS: {
    code: 'ID_NUMBER_EXISTS',
    message: 'El número de identificación ya está registrado',
    httpStatus: 409,
  },

  // Errores de negocio
  APPOINTMENT_CONFLICT: {
    code: 'APPOINTMENT_CONFLICT',
    message: 'Conflicto de horario. El paciente o psiquiatra ya tiene una cita en ese horario',
    httpStatus: 422,
  },
  INVALID_APPOINTMENT_TIME: {
    code: 'INVALID_APPOINTMENT_TIME',
    message: 'Horario de cita inválido. Debe ser en horario laboral',
    httpStatus: 422,
  },
  PAST_APPOINTMENT_DATE: {
    code: 'PAST_APPOINTMENT_DATE',
    message: 'No se pueden programar citas en fechas pasadas',
    httpStatus: 422,
  },

  // Errores del servidor
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Error interno del servidor',
    httpStatus: 500,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Error de base de datos',
    httpStatus: 500,
  },
};

// Función para crear respuestas de error estándar
export const createErrorResponse = (
  code: string,
  message: string,
  details?: any,
  httpStatus?: number
): ApiResponse => {
  const errorInfo = ERROR_CODES[code] || {
    code,
    message,
    httpStatus: httpStatus || 500,
  };

  return {
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
};

// Middleware de manejo de errores
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('🚨 Error capturado:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
  });

  // Errores de validación de Joi
  if (error.isJoi) {
    const details = error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Datos de entrada inválidos', details, 400)
    );
    return;
  }

  // Errores de base de datos PostgreSQL
  if (error.code === '23505') { // Unique violation
    const field = error.constraint?.includes('email') ? 'email' : 
                 error.constraint?.includes('id_number') ? 'id_number' :
                 error.constraint?.includes('medical_record_number') ? 'medical_record_number' : 'unknown';
    
    const message = field === 'email' ? 'El email ya está registrado' :
                   field === 'id_number' ? 'El número de identificación ya está registrado' :
                   field === 'medical_record_number' ? 'El número de historia clínica ya existe' :
                   'Recurso duplicado';

    res.status(409).json(
      createErrorResponse(`${field.toUpperCase()}_ALREADY_EXISTS`, message, { field }, 409)
    );
    return;
  }

  if (error.code === '23503') { // Foreign key violation
    res.status(400).json(
      createErrorResponse('INVALID_REFERENCE', 'Referencia inválida', { constraint: error.constraint }, 400)
    );
    return;
  }

  if (error.code === '23514') { // Check violation
    res.status(400).json(
      createErrorResponse('INVALID_DATA', 'Datos no cumplen con las restricciones', { constraint: error.constraint }, 400)
    );
    return;
  }

  // Errores de JWT
  if (error.name === 'JsonWebTokenError') {
    res.status(403).json(
      createErrorResponse('INVALID_TOKEN', 'Token inválido', null, 403)
    );
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(403).json(
      createErrorResponse('TOKEN_EXPIRED', 'Token expirado', null, 403)
    );
    return;
  }

  // Errores personalizados de la aplicación
  if (error.isCustomError) {
    res.status(error.statusCode || 500).json(
      createErrorResponse(error.code, error.message, error.details, error.statusCode)
    );
    return;
  }

  // Errores no manejados
  res.status(500).json(
    createErrorResponse('INTERNAL_SERVER_ERROR', 'Error interno del servidor', {
      requestId: req.headers['x-request-id'],
    }, 500)
  );
};

// Middleware para capturar errores 404
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(
    createErrorResponse('NOT_FOUND', `Ruta ${req.method} ${req.originalUrl} no encontrada`, null, 404)
  );
};

// Clase para errores personalizados
export class AppError extends Error {
  public isCustomError: boolean = true;
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Funciones helper para crear errores específicos
export const createNotFoundError = (resource: string): AppError => {
  return new AppError(
    `${resource.toUpperCase()}_NOT_FOUND`,
    `${resource.charAt(0).toUpperCase() + resource.slice(1)} no encontrado/a`,
    404
  );
};

export const createValidationError = (message: string, details?: any): AppError => {
  return new AppError('VALIDATION_ERROR', message, 400, details);
};

export const createConflictError = (message: string, details?: any): AppError => {
  return new AppError('CONFLICT', message, 409, details);
};

export const createUnauthorizedError = (message: string = 'No autorizado'): AppError => {
  return new AppError('UNAUTHORIZED', message, 401);
};