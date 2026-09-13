import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { APP_NAME } from './config/constants';
import { connectDB } from './database';
import { seedDatabase } from './database/seed';
import { initSocketServer } from './websocket/socketManager';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Route Imports
import authRoutes from './routes/authRoutes';
import menuRoutes from './routes/menuRoutes';
import tableRoutes from './routes/tableRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import adminRoutes from './routes/adminRoutes';
import publicRoutes from './routes/publicRoutes';
import businessRoutes from './routes/businessRoutes';

const app = express();
const httpServer = http.createServer(app);

// Initialize WebSockets
initSocketServer(httpServer, config.frontendUrl);

// A single abusive client shouldn't be able to take down the whole
// multi-tenant process — applied ahead of routes, exempting /health so
// uptime probes never get throttled.
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 300 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } }
});

// Middleware Setup
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(compression());
// Raised from Express's 100kb default so a base64-encoded menu image upload
// (see menuController.uploadMenuImage) fits in the request body.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use(cookieParser());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));
app.use('/api/v1', apiRateLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/business', businessRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: `${APP_NAME} SaaS Backend API`, timestamp: new Date() });
});

// Centralized Error Handler
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection');
});

// Connect DB & Start Server
const startServer = async () => {
  await connectDB();
  await seedDatabase(false);

  const port = Number(config.port) || 5000;

  httpServer.on('error', (err: any) => {
    logger.error({ err }, 'HTTP Server Error');
  });

  httpServer.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 ${APP_NAME} Multi-Tenant Backend running on port ${port} · WebSocket Engine ready · Health Check: http://0.0.0.0:${port}/health`);
  });
};

startServer();


