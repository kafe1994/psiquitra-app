import { Pool } from 'pg';
import config from '@/config';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20, // máximo número de conexiones en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: config.isProduction ? { rejectUnauthorized: false } : false,
    });

    // Manejar eventos de conexión
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