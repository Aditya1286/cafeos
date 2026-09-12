import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend folder and root project folder
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cafeos',
  jwtSecret: process.env.JWT_SECRET || 'cafeos_super_secret_jwt_key_2026_production_ready',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_cafeos_mock_secret',
};

