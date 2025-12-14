import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/models/User';
import { validate, schemas } from '@/middleware/validation';
import { authRateLimit } from '@/middleware/rateLimit';
import { createErrorResponse } from '@/middleware/errorHandler';
import { LoginRequest, RegisterRequest, User } from '@/types';
import config from '@/config';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Registrar nuevo psiquiatra
 */
router.post('/register', 
  authRateLimit,
  validate(schemas.register),
  async (req: Request, res: Response) => {
    try {
      const userData: RegisterRequest = req.body;
      
      // Verificar si el email ya existe
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json(
          createErrorResponse(
            'EMAIL_ALREADY_EXISTS',
            'El email ya está registrado',
            { email: userData.email },
            409
          )
        );
      }
      
      // Crear usuario
      const newUser = await UserModel.create(userData);
      
      // Generar tokens
      const accessToken = jwt.sign(
        { userId: newUser.id, email: newUser.email, role: newUser.role },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
      );
      
      const refreshToken = jwt.sign(
        { userId: newUser.id, type: 'refresh' },
        config.auth.refreshTokenSecret,
        { expiresIn: config.auth.refreshTokenExpiresIn }
      );
      
      // Respuesta sin password_hash
      const { password_hash, ...userResponse } = newUser;
      
      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          accessToken,
          refreshToken,
          expiresIn: config.auth.jwtExpiresIn
        }
      });
      
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json(
        createErrorResponse('REGISTRATION_ERROR', 'Error al registrar usuario')
      );
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Iniciar sesión
 */
router.post('/login',
  authRateLimit,
  validate(schemas.login),
  async (req: Request, res: Response) => {
    try {
      const { email, password }: LoginRequest = req.body;
      
      // Buscar usuario
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json(
          createErrorResponse(
            'INVALID_CREDENTIALS',
            'Credenciales inválidas',
            { email },
            401
          )
        );
      }
      
      // Verificar contraseña (necesitamos obtener el password_hash)
      const userWithPassword = await UserModel.findByEmail(email);
      if (!userWithPassword || !userWithPassword.password_hash) {
        return res.status(401).json(
          createErrorResponse(
            'INVALID_CREDENTIALS',
            'Credenciales inválidas',
            null,
            401
          )
        );
      }
      
      const isValidPassword = await UserModel.verifyPassword(password, userWithPassword.password_hash);
      if (!isValidPassword) {
        return res.status(401).json(
          createErrorResponse(
            'INVALID_CREDENTIALS',
            'Credenciales inválidas',
            null,
            401
          )
        );
      }
      
      // Verificar si la cuenta está activa
      if (!user.is_active) {
        return res.status(401).json(
          createErrorResponse(
            'ACCOUNT_DISABLED',
            'La cuenta está desactivada. Contacte al administrador',
            null,
            401
          )
        );
      }
      
      // Generar tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
      );
      
      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        config.auth.refreshTokenSecret,
        { expiresIn: config.auth.refreshTokenExpiresIn }
      );
      
      // Respuesta sin datos sensibles
      const { password_hash, ...userResponse } = user;
      
      res.json({
        success: true,
        data: {
          user: userResponse,
          accessToken,
          refreshToken,
          expiresIn: config.auth.jwtExpiresIn
        }
      });
      
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json(
        createErrorResponse('LOGIN_ERROR', 'Error al iniciar sesión')
      );
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Renovar token de acceso
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json(
        createErrorResponse(
          'REFRESH_TOKEN_REQUIRED',
          'Refresh token requerido',
          null,
          401
        )
      );
    }
    
    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, config.auth.refreshTokenSecret) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json(
        createErrorResponse(
          'INVALID_TOKEN_TYPE',
          'Tipo de token inválido',
          null,
          401
        )
      );
    }
    
    // Obtener usuario actual
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json(
        createErrorResponse(
          'USER_NOT_FOUND',
          'Usuario no encontrado o desactivado',
          null,
          401
        )
      );
    }
    
    // Generar nuevo access token
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );
    
    const { password_hash, ...userResponse } = user;
    
    res.json({
      success: true,
      data: {
        user: userResponse,
        accessToken: newAccessToken,
        expiresIn: config.auth.jwtExpiresIn
      }
    });
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json(
        createErrorResponse(
          'INVALID_REFRESH_TOKEN',
          'Refresh token inválido o expirado',
          null,
          401
        )
      );
    }
    
    console.error('Error en refresh token:', error);
    res.status(500).json(
      createErrorResponse('REFRESH_ERROR', 'Error al renovar token')
    );
  }
});

/**
 * POST /api/v1/auth/logout
 * Cerrar sesión
 */
router.post('/logout', (req: Request, res: Response) => {
  // En una implementación más robusta, aquí se agregaría el token a una blacklist
  // Por ahora, simplemente respondemos éxito
  res.json({
    success: true,
    data: {
      message: 'Sesión cerrada exitosamente'
    }
  });
});

/**
 * GET /api/v1/auth/me
 * Obtener datos del usuario actual
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(
        createErrorResponse(
          'ACCESS_TOKEN_REQUIRED',
          'Token de acceso requerido',
          null,
          401
        )
      );
    }
    
    // Verificar token
    const decoded = jwt.verify(token, config.auth.jwtSecret) as { userId: string };
    const user = await UserModel.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json(
        createErrorResponse(
          'USER_NOT_FOUND',
          'Usuario no encontrado o desactivado',
          null,
          401
        )
      );
    }
    
    const { password_hash, ...userResponse } = user;
    
    res.json({
      success: true,
      data: userResponse
    });
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json(
        createErrorResponse(
          'INVALID_TOKEN',
          'Token inválido o expirado',
          null,
          401
        )
      );
    }
    
    console.error('Error en /me:', error);
    res.status(500).json(
      createErrorResponse('FETCH_USER_ERROR', 'Error al obtener datos del usuario')
    );
  }
});

/**
 * PUT /api/v1/auth/profile
 * Actualizar perfil del usuario
 */
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(
        createErrorResponse(
          'ACCESS_TOKEN_REQUIRED',
          'Token de acceso requerido',
          null,
          401
        )
      );
    }
    
    const decoded = jwt.verify(token, config.auth.jwtSecret) as { userId: string };
    const { full_name, license_number, specialty } = req.body;
    
    const updates: Partial<User> = {};
    if (full_name) updates.full_name = full_name;
    if (license_number !== undefined) updates.license_number = license_number;
    if (specialty !== undefined) updates.specialty = specialty;
    
    const updatedUser = await UserModel.update(decoded.userId, updates);
    
    if (!updatedUser) {
      return res.status(404).json(
        createErrorResponse(
          'USER_NOT_FOUND',
          'Usuario no encontrado',
          null,
          404
        )
      );
    }
    
    res.json({
      success: true,
      data: updatedUser
    });
    
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json(
      createErrorResponse('UPDATE_PROFILE_ERROR', 'Error al actualizar perfil')
    );
  }
});

/**
 * PUT /api/v1/auth/password
 * Cambiar contraseña
 */
router.put('/password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(
        createErrorResponse(
          'ACCESS_TOKEN_REQUIRED',
          'Token de acceso requerido',
          null,
          401
        )
      );
    }
    
    const decoded = jwt.verify(token, config.auth.jwtSecret) as { userId: string };
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json(
        createErrorResponse(
          'MISSING_FIELDS',
          'Contraseña actual y nueva contraseña son requeridas',
          null,
          400
        )
      );
    }
    
    // Verificar contraseña actual
    const user = await UserModel.findByEmail(decoded.email);
    if (!user || !user.password_hash) {
      return res.status(401).json(
        createErrorResponse(
          'INVALID_CREDENTIALS',
          'Credenciales inválidas',
          null,
          401
        )
      );
    }
    
    const isValidPassword = await UserModel.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json(
        createErrorResponse(
          'INVALID_CURRENT_PASSWORD',
          'Contraseña actual incorrecta',
          null,
          401
        )
      );
    }
    
    // Cambiar contraseña
    const success = await UserModel.changePassword(decoded.userId, newPassword);
    
    if (!success) {
      return res.status(404).json(
        createErrorResponse(
          'USER_NOT_FOUND',
          'Usuario no encontrado',
          null,
          404
        )
      );
    }
    
    res.json({
      success: true,
      data: {
        message: 'Contraseña actualizada exitosamente'
      }
    });
    
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json(
      createErrorResponse('CHANGE_PASSWORD_ERROR', 'Error al cambiar contraseña')
    );
  }
});

export default router;