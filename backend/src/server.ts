import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectDB } from './database';
import { seedDatabase } from './database/seed';
import { initSocketServer } from './websocket/socketManager';
import { errorHandler } from './middleware/errorHandler';

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

const app = express();
const httpServer = http.createServer(app);

// Initialize WebSockets
initSocketServer(httpServer, config.frontendUrl);

// Middleware Setup
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

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

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'CaféOS SaaS Backend API', timestamp: new Date() });
});

// Centralized Error Handler
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', reason);
});

// Connect DB & Start Server
const startServer = async () => {
  await connectDB();
  await seedDatabase(true);

  const port = Number(config.port) || 5000;
  
  httpServer.on('error', (err: any) => {
    console.error('[HTTP Server Error]:', err);
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🚀 CaféOS Multi-Tenant Backend running on port ${port}`);
    console.log(`📡 WebSocket Engine ready`);
    console.log(`🌐 Health Check: http://0.0.0.0:${port}/health`);
    console.log(`===================================================`);
  });
};

startServer();


