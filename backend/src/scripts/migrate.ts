import { readFileSync } from 'fs';
import { join } from 'path';
import database from '@/config/database';

class MigrationRunner {
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = join(__dirname, '../migrations');
  }

  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Iniciando migraciones de base de datos...');

      // Verificar si las migraciones ya se han ejecutado
      const migrationTableExists = await this.checkMigrationTable();
      if (!migrationTableExists) {
        await this.createMigrationTable();
      }

      // Obtener migraciones pendientes
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('✅ Todas las migraciones están al día');
        return;
      }

      console.log(`📋 Ejecutando ${pendingMigrations.length} migraciones...`);

      // Ejecutar cada migración
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('🎉 Migraciones completadas exitosamente');

    } catch (error) {
      console.error('❌ Error ejecutando migraciones:', error);
      throw error;
    }
  }

  private async checkMigrationTable(): Promise<boolean> {
    try {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'schema_migrations'
        )
      `;
      
      const result = await database.query(query);
      return result.rows[0].exists;
    } catch (error) {
      return false;
    }
  }

  private async createMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await database.query(query);
    console.log('📋 Tabla de migraciones creada');
  }

  private async getPendingMigrations(): Promise<string[]> {
    const query = `
      SELECT filename FROM schema_migrations ORDER BY filename
    `;
    
    const executedResult = await database.query(query);
    const executedMigrations = executedResult.rows.map(row => row.filename);

    // Leer archivos de migración del directorio
    const fs = require('fs');
    const migrationFiles = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Filtrar migraciones pendientes
    const pendingMigrations = migrationFiles.filter(file => !executedMigrations.includes(file));
    
    return pendingMigrations;
  }

  private async executeMigration(filename: string): Promise<void> {
    try {
      console.log(`⏳ Ejecutando migración: ${filename}`);
      
      // Leer contenido del archivo SQL
      const filePath = join(this.migrationsDir, filename);
      const sqlContent = readFileSync(filePath, 'utf8');

      // Iniciar transacción
      await database.query('BEGIN');

      try {
        // Dividir el SQL en statements individuales
        const statements = this.splitSQLStatements(sqlContent);

        // Ejecutar cada statement
        for (const statement of statements) {
          if (statement.trim()) {
            await database.query(statement);
          }
        }

        // Registrar la migración como ejecutada
        await database.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );

        // Confirmar transacción
        await database.query('COMMIT');
        
        console.log(`✅ Migración completada: ${filename}`);

      } catch (error) {
        // Revertir transacción en caso de error
        await database.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error(`❌ Error ejecutando migración ${filename}:`, error);
      throw error;
    }
  }

  private splitSQLStatements(sqlContent: string): string[] {
    // Dividir por punto y coma, pero manejar casos especiales
    const statements: string[] = [];
    let currentStatement = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inDollarQuote = false;
    let dollarQuoteTag = '';

    for (let i = 0; i < sqlContent.length; i++) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1];

      // Manejar dollar quoting
      if (!inSingleQuote && !inDoubleQuote && char === '$') {
        if (!inDollarQuote) {
          // Iniciar dollar quote
          const start = i;
          while (sqlContent[i + 1] !== '$' && i < sqlContent.length - 1) {
            i++;
          }
          dollarQuoteTag = sqlContent.substring(start, i + 1);
          inDollarQuote = true;
        } else {
          // Fin del dollar quote
          if (sqlContent.substring(i, i + dollarQuoteTag.length) === dollarQuoteTag) {
            inDollarQuote = false;
            dollarQuoteTag = '';
          }
        }
      }

      // Manejar comillas simples
      if (!inDoubleQuote && !inDollarQuote && char === "'" && sqlContent[i - 1] !== '\\') {
        inSingleQuote = !inSingleQuote;
      }

      // Manejar comillas dobles
      if (!inSingleQuote && !inDollarQuote && char === '"') {
        inDoubleQuote = !inDoubleQuote;
      }

      // Agregar carácter al statement actual
      currentStatement += char;

      // Si encontramos un punto y coma fuera de strings, completar el statement
      if (char === ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote) {
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentStatement = '';
      }
    }

    // Agregar el último statement si existe
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements;
  }

  async rollbackMigration(filename: string): Promise<void> {
    // Implementar rollback si es necesario
    console.warn(`⚠️  Rollback no implementado para: ${filename}`);
  }
}

// Ejecutar migraciones si se llama directamente
if (require.main === module) {
  const runner = new MigrationRunner();
  
  runner.runMigrations()
    .then(() => {
      console.log('🎉 Migraciones completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migraciones:', error);
      process.exit(1);
    });
}

export default MigrationRunner;