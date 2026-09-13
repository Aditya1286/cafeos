import dotenv from 'dotenv';
import path from 'path';
import { APP_NAME, APP_SLUG } from './constants';
// Load .env from backend folder and root project folder
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || `mongodb://127.0.0.1:27017/${APP_SLUG}`,
  jwtSecret: process.env.JWT_SECRET || `${APP_SLUG}_super_secret_jwt_key_2026_production_ready`,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || `whsec_${APP_SLUG}_mock_secret`,
  msg91AuthKey: process.env.AUTH_KEY || '570575TJIuw946StnY6aa5763eP1',
  msg91TemplateId: process.env.TEMPLATE_ID,
  // 'mock' skips the real SMS provider and returns the OTP in the API response
  // so staging/QA can self-serve without burning SMS credits. Defaults to mock
  // everywhere except production; set OTP_MODE=live to force real MSG91 sends
  // (e.g. for a pre-prod staging env that wants to test the real integration).
  otpMode: (process.env.OTP_MODE as 'mock' | 'live') || (process.env.NODE_ENV === 'production' ? 'live' : 'mock'),

  // Platform's own UPI ID — where businesses pay their commission dues. Distinct from any
  // business's own upiVpa (that one collects customer payments, this one collects ours).
  platformUpiVpa: process.env.PLATFORM_UPI_VPA || `${APP_SLUG}@okhdfcbank`,
  platformPayeeName: process.env.PLATFORM_PAYEE_NAME || `${APP_NAME} Technologies`,
};

