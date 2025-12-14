import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import config from '@/config';
import database from '@/config/database';

// Middleware
import { 
  generalRateLimit, 
  securityHeaders, 
  requestLogger, 
  requestId, 
  corsHandler 
} from '@/middleware/rateLimit';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

// Importar rutas
import authRoutes from '@/routes/auth';
import patientRoutes from '@/routes/patients';
import appointmentRoutes from '@/routes/appointments';
import dashboardRoutes from '@/routes/dashboard';
import clinicalRoutes from '@/routes/clinical';

class Server {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Middleware de seguridad
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:"],
          fontSrc: ["'self'", "https:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    // CORS
    this.app.use(corsHandler);

    // Rate limiting
    this.app.use(generalRateLimit);

    // Headers de seguridad adicionales
    this.app.use(securityHeaders);

    // Logging
    this.app.use(requestLogger);
    this.app.use(requestId);

    // Parsing de body
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Morgan para logging HTTP
    if (!config.isProduction) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Servir archivos estáticos en producción
    if (config.isProduction) {
      this.app.use(express.static(path.join(__dirname, '../public')));
    }
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.env
      });
    });

    this.app.get('/health/db', async (req, res) => {
      try {
        const isConnected = await database.testConnection();
        res.json({
          status: isConnected ? 'healthy' : 'unhealthy',
          database: isConnected ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          database: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // API routes
    this.app.use(config.server.apiPrefix, authRoutes);
    this.app.use(`${config.server.apiPrefix}/patients`, patientRoutes);
    this.app.use(`${config.server.apiPrefix}/appointments`, appointmentRoutes);
    this.app.use(`${config.server.apiPrefix}/dashboard`, dashboardRoutes);
    this.app.use(`${config.server.apiPrefix}/clinical`, clinicalRoutes);

    // API documentation (en desarrollo)
    if (!config.isProduction) {
      this.app.get(`${config.server.apiPrefix}`, (req, res) => {
        res.json({
          message: 'Psychiatry Management System API',
          version: '1.0.0',
          endpoints: {
            auth: `${config.server.apiPrefix}/auth`,
            patients: `${config.server.apiPrefix}/patients`,
            appointments: `${config.server.apiPrefix}/appointments`,
            dashboard: `${config.server.apiPrefix}/dashboard`,
            clinical: `${config.server.apiPrefix}/clinical`
          },
          documentation: 'https://github.com/your-repo/psychiatry-system',
          timestamp: new Date().toISOString()
        });
      });
    }

    // Manejar SPA en producción (redirigir todas las rutas no API a index.html)
    if (config.isProduction) {
      this.app.get('*', (req, res) => {
        if (!req.url.startsWith(config.server.apiPrefix)) {
          res.sendFile(path.join(__dirname, '../public/index.html'));
        }
      });
    }
  }

  private initializeErrorHandling(): void {
    // Middleware para rutas no encontradas
    this.app.use(notFoundHandler);

    // Middleware global de manejo de errores
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Probar conexión a la base de datos
      console.log('🔄 Conectando a la base de datos...');
      const isConnected = await database.testConnection();
      
      if (!isConnected) {
        console.error('❌ No se pudo conectar a la base de datos');
        process.exit(1);
      }

      // Iniciar servidor
      const server = this.app.listen(config.server.port, () => {
        console.log(`
🚀 Servidor iniciado exitosamente!

📍 URL: http://localhost:${config.server.port}
🌍 Entorno: ${config.server.env}
🔗 API: ${config.server.apiPrefix}
⚡ Base de datos: ${config.database.host}:${config.database.port}/${config.database.name}

🛡️  Características de seguridad:
   • Helmet.js para headers de seguridad
   • Rate limiting activado
   • CORS configurado
   • Validación de entrada
   • Logging estructurado

📊 Endpoints disponibles:
   • ${config.server.apiPrefix}/auth/* - Autenticación
   • ${config.server.apiPrefix}/patients/* - Gestión de pacientes
   • ${config.server.apiPrefix}/appointments/* - Gestión de citas
   • ${config.server.apiPrefix}/dashboard/* - Dashboard y estadísticas
   • ${config.server.apiPrefix}/clinical/* - Historial clínico (Fase 2)
   • /health - Health check
   • /health/db - Health check de base de datos
        `);
      });

      // Manejo graceful de cierre
      process.on('SIGTERM', () => {
        console.log('📴 SIGTERM recibido, cerrando servidor...');
        server.close(async () => {
          console.log('🔒 Cerrando conexión a la base de datos...');
          await database.close();
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('📴 SIGINT recibido, cerrando servidor...');
        server.close(async () => {
          console.log('🔒 Cerrando conexión a la base de datos...');
          await database.close();
          process.exit(0);
        });
      });

    } catch (error) {
      console.error('❌ Error iniciando el servidor:', error);
      process.exit(1);
    }
  }
}

// Crear y iniciar servidor
const server = new Server();
server.start().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

export default server;