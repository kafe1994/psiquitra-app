import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from './errorHandler';
import config from '@/config';

// Rate limiting general para la API
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutos
  max: config.rateLimit.maxRequests, // límite por IP
  message: createErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    'Demasiadas solicitudes desde esta IP, intente de nuevo más tarde',
    { windowMs: config.rateLimit.windowMs, maxRequests: config.rateLimit.maxRequests },
    429
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Demasiadas solicitudes desde esta IP, intente de nuevo más tarde',
        { 
          windowMs: config.rateLimit.windowMs,
          maxRequests: config.rateLimit.maxRequests,
          retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
        },
        429
      )
    );
  },
});

// Rate limiting estricto para endpoints de autenticación
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por IP por ventana de tiempo
  message: createErrorResponse(
    'AUTH_RATE_LIMIT_EXCEEDED',
    'Demasiados intentos de autenticación. Intente de nuevo en 15 minutos',
    { windowMs: 15 * 60 * 1000, maxAttempts: 5 },
    429
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No cuenta requests exitosos
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createErrorResponse(
        'AUTH_RATE_LIMIT_EXCEEDED',
        'Demasiados intentos de autenticación. Intente de nuevo en 15 minutos',
        { 
          windowMs: 15 * 60 * 1000,
          maxAttempts: 5,
          retryAfter: Math.ceil((15 * 60 * 1000) / 1000)
        },
        429
      )
    );
  },
});

// Rate limiting para operaciones de escritura críticas
export const writeOperationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 operaciones de escritura por IP por ventana
  message: createErrorResponse(
    'WRITE_OPERATION_RATE_LIMIT_EXCEEDED',
    'Demasiadas operaciones de escritura. Intente de nuevo en 5 minutos',
    { windowMs: 5 * 60 * 1000, maxOperations: 20 },
    429
  ),
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para validar el tamaño del payload
export const validatePayloadSize = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    const maxBytes = parseSize(maxSize);
    
    if (contentLength && parseInt(contentLength) > maxBytes) {
      return res.status(413).json(
        createErrorResponse(
          'PAYLOAD_TOO_LARGE',
          `El payload es demasiado grande. Tamaño máximo: ${maxSize}`,
          { maxSize, actualSize: contentLength },
          413
        )
      );
    }
    
    next();
  };
};

// Helper para convertir strings de tamaño a bytes
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z]+)$/);
  if (!match) {
    throw new Error(`Formato de tamaño inválido: ${size}`);
  }
  
  const [, value, unit] = match;
  const multiplier = units[unit];
  if (!multiplier) {
    throw new Error(`Unidad de tamaño no reconocida: ${unit}`);
  }
  
  return parseFloat(value) * multiplier;
}

// Middleware para agregar headers de seguridad
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Habilitar protección XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control de referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Política de contenido (ajustar según necesidades)
  if (config.isProduction) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;"
    );
  }
  
  next();
};

// Middleware para logging de requests
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log de request entrante
  console.log(`📥 ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`);
  
  // Override res.end para medir duración
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Log de response
    const emoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    console.log(`${emoji} ${method} ${url} - ${statusCode} - ${duration}ms`);
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Middleware para agregar ID único a cada request
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId as string;
  res.setHeader('X-Request-ID', requestId as string);
  
  next();
};

// Middleware para manejo de CORS
export const corsHandler = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Lista de orígenes permitidos
  const allowedOrigins = [
    config.cors.origin,
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  
  next();
};