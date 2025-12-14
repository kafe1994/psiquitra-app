import { Pool } from 'pg';

class Database {
  private pool: Pool;

  constructor() {
    // Usar variables de entorno directamente
    this.pool = new Pool({
      host: process.env.SUPABASE_DB_HOST || 'localhost',
      port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
      database: process.env.SUPABASE_DB_NAME || 'postgres',
      user: process.env.SUPABASE_DB_USER || 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.pool.on('connect', () => {
      console.log('✅ Nueva conexión a la base de datos establecida');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Error inesperado en la base de datos:', err);
    });
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('📊 Query ejecutada:', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('❌ Error en query:', { text, error });
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('✅ Conexión a base de datos exitosa:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Error conectando a la base de datos:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('🔒 Conexión a la base de datos cerrada');
  }
}

// Instancia singleton
const database = new Database();

export default database;