import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '@/types';
import config from '@/config';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'ACCESS_TOKEN_REQUIRED',
        message: 'Token de acceso requerido',
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido o expirado',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Permisos insuficientes para esta acción',
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
};

// Middleware opcional para casos donde la autenticación no es obligatoria
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = jwt.verify(token, config.auth.jwtSecret) as AuthPayload;
      req.user = payload;
    } catch (error) {
      // Silently continue without user context
      console.warn('Token inválido en autenticación opcional:', error);
    }
  }

  next();
};