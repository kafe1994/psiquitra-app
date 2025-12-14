import database from '@/config/database';
import { User, RegisterRequest } from '@/types';
import bcrypt from 'bcryptjs';
import config from '@/config';
import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  /**
   * Crear un nuevo usuario
   */
  static async create(userData: RegisterRequest): Promise<User> {
    const { email, password, full_name, license_number, specialty } = userData;
    
    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    
    // Generar ID único
    const id = uuidv4();
    
    const query = `
      INSERT INTO users (
        id, email, password_hash, full_name, role, license_number, specialty, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, full_name, role, license_number, specialty, is_active, created_at, updated_at
    `;
    
    const values = [
      id,
      email.toLowerCase().trim(),
      passwordHash,
      full_name.trim(),
      'psychiatrist', // Por defecto todos son psiquiatras
      license_number?.trim() || null,
      specialty?.trim() || null,
      true // is_active por defecto
    ];
    
    const result = await database.query(query, values);
    return result.rows[0];
  }

  /**
   * Buscar usuario por email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, full_name, role, license_number, specialty, is_active, created_at, updated_at
      FROM users
      WHERE email = $1 AND is_active = true
    `;
    
    const result = await database.query(query, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  }

  /**
   * Buscar usuario por ID
   */
  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, full_name, role, license_number, specialty, is_active, created_at, updated_at
      FROM users
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await database.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Verificar contraseña
   */
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Obtener todos los usuarios (para admin)
   */
  static async findAll(page: number = 1, limit: number = 20): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT id, email, full_name, role, license_number, specialty, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE is_active = true
    `;
    
    const [usersResult, countResult] = await Promise.all([
      database.query(query, [limit, offset]),
      database.query(countQuery)
    ]);
    
    return {
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Actualizar usuario
   */
  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    const allowedFields = ['full_name', 'license_number', 'specialty', 'is_active'];
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    // Construir cláusula SET dinámicamente
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key as keyof User] !== undefined) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(updates[key as keyof User]);
        paramCount++;
      }
    });
    
    if (setClause.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE users
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, email, full_name, role, license_number, specialty, is_active, created_at, updated_at
    `;
    
    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Cambiar contraseña
   */
  static async changePassword(id: string, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
    
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    
    const result = await database.query(query, [passwordHash, id]);
    return result.rowCount > 0;
  }

  /**
   * Verificar si el email ya existe
   */
  static async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM users
      WHERE email = $1
    `;
    
    const values = [email.toLowerCase().trim()];
    
    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }
    
    const result = await database.query(query, values);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Desactivar usuario (soft delete)
   */
  static async deactivate(id: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await database.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Activar usuario
   */
  static async activate(id: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET is_active = true, updated_at = NOW()
      WHERE id = $1 AND is_active = false
    `;
    
    const result = await database.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Obtener estadísticas de usuarios
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_role: Record<string, number>;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
        role,
        COUNT(*) as count_by_role
      FROM users
      GROUP BY role
    `;
    
    const result = await database.query(query);
    
    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      by_role: {} as Record<string, number>
    };
    
    result.rows.forEach(row => {
      stats.total += parseInt(row.count_by_role);
      stats.by_role[row.role] = parseInt(row.count_by_role);
    });
    
    // Calcular active e inactive de forma separada para mayor precisión
    const totalsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM users
    `;
    
    const totalsResult = await database.query(totalsQuery);
    stats.total = parseInt(totalsResult.rows[0].total);
    stats.active = parseInt(totalsResult.rows[0].active);
    stats.inactive = parseInt(totalsResult.rows[0].inactive);
    
    return stats;
  }
}