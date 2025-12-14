import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración simplificada para Railway
const config = {
  // Base de datos
  database: {
    url: process.env.DATABASE_URL || '',
    host: process.env.SUPABASE_DB_HOST || process.env.SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '.supabase.co'),
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    name: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || '',
  },

  // Servidor
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'production',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
  },

  // Autenticación
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret-change-this',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Configuración de entorno
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Variables de Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
};

export default config;