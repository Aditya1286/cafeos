import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { runtime, server } from './config';
import { APP_NAME } from './config/constants';
import { connectDB } from './database';
import { backfillUserPhoneKeys } from './database/migrations/backfillUserPhoneKeys';
import { initSocketServer } from './websocket/socketManager';
import { errorHandler } from './middleware/errorHandler';
import { rejectMongoOperators } from './middleware/rejectMongoOperators';
import { logger } from './utils/logger';
import { startSystemMetricsCollector } from './services/systemMetrics.service';
import { startCheckoutSweep } from './services/checkout.service';

// Route Imports
import authRoutes from './routes/authRoutes';
import { demoGuard } from './demo/demoGuard';
import menuRoutes from './routes/menuRoutes';
import tableRoutes from './routes/tableRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import adminRoutes from './routes/adminRoutes';
import publicRoutes from './routes/publicRoutes';
import businessRoutes from './routes/businessRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import reviewRoutes from './routes/reviewRoutes';
import supportRoutes from './routes/supportRoutes';
import accountRoutes from './routes/accountRoutes';
import staffRoutes from './routes/staffRoutes';
import demoRoutes from './demo/demo.routes';

const app = express();
const httpServer = http.createServer(app);

// In production every request arrives via the frontend container's nginx, so without this
// req.ip is nginx's own address and every rate limiter below becomes one bucket shared by
// all users. Only proxies on loopback/private networks (nginx on the Docker network) are
// trusted to set X-Forwarded-For — a client hitting the backend's port directly from the
// internet can't spoof its IP through that header.
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// Initialize WebSockets
initSocketServer(httpServer, server.frontendUrl);

// A single abusive client shouldn't be able to take down the whole
// multi-tenant process — applied ahead of routes, exempting /health so
// uptime probes never get throttled.
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: runtime.nodeEnv === 'production' ? 300 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } }
});

// Middleware Setup
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [server.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(compression());
// Raised from Express's 100kb default so a base64-encoded menu image upload
// (see menuController.uploadMenuImage) fits in the request body.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use(cookieParser());
app.use(morgan(runtime.nodeEnv === 'production' ? 'combined' : 'dev', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));
app.use('/api/v1', apiRateLimiter);
app.use('/api/v1', rejectMongoOperators);
// app.use('/api/v1', demoGuard);

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
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/demo', demoRoutes);

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
  // Lets accounts from before phone login sign in with their number.
  await backfillUserPhoneKeys();
  startSystemMetricsCollector();
  // Confirms SMEPay checkouts whose customer never came back to the return page.
  startCheckoutSweep();

  const port = server.port;

  httpServer.on('error', (err: any) => {
    logger.error({ err }, 'HTTP Server Error');
  });

  httpServer.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 ${APP_NAME} Multi-Tenant Backend running on port ${port} · WebSocket Engine ready · Health Check: http://0.0.0.0:${port}/health`);
  });
};

startServer();


