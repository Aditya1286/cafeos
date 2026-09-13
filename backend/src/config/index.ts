import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import nconf from 'nconf';
import { APP_NAME, APP_SLUG } from './constants';

// dotenv still populates process.env from .env files — nconf's env() layer below just
// reads whatever is already in process.env, it doesn't parse .env files itself.
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

const env = process.env.NODE_ENV || 'development';

// Precedence (highest first): CLI args > environment variables > this environment's
// config.<env>.json (backend root) > hardcoded defaults below. Same precedence an env
// var already had over a hardcoded default — just with a per-environment file layer
// slotted in between the two, so config.production.json (say) can hold real values
// without touching code, while still being overridable by an actual env var.
nconf.argv().env();

const envConfigPath = path.join(__dirname, '../../', `config.${env}.json`);
if (fs.existsSync(envConfigPath)) {
  nconf.file('environment', { file: envConfigPath });
}

nconf.defaults({
  PORT: 5000,
  NODE_ENV: 'development',
  MONGO_URI: `mongodb://127.0.0.1:27017/${APP_SLUG}`,
  JWT_SECRET: `${APP_SLUG}_super_secret_jwt_key_2026_production_ready`,
  JWT_EXPIRES_IN: '7d',
  FRONTEND_URL: 'http://localhost:5173',
  PAYMENT_WEBHOOK_SECRET: `whsec_${APP_SLUG}_mock_secret`,
  AUTH_KEY: '570575TJIuw946StnY6aa5763eP1',
  // 'mock' skips the real SMS provider and returns the OTP in the API response so
  // staging/QA can self-serve without burning SMS credits. Defaults to mock everywhere
  // except production; set OTP_MODE=live (env, or in a config.<env>.json) to force real
  // MSG91 sends (e.g. for a pre-prod staging env that wants to test the real integration).
  OTP_MODE: env === 'production' ? 'live' : 'mock',
  // Platform's own UPI ID — where businesses pay their commission dues. Distinct from any
  // business's own upiVpa (that one collects customer payments, this one collects ours).
  PLATFORM_UPI_VPA: `${APP_SLUG}@okhdfcbank`,
  PLATFORM_PAYEE_NAME: `${APP_NAME} Technologies`
});

// Same shape as before nconf — every call site elsewhere in the app is untouched.
export const config = {
  port: nconf.get('PORT'),
  nodeEnv: nconf.get('NODE_ENV'),
  mongoUri: nconf.get('MONGO_URI'),
  jwtSecret: nconf.get('JWT_SECRET'),
  jwtExpiresIn: nconf.get('JWT_EXPIRES_IN'),
  frontendUrl: nconf.get('FRONTEND_URL'),
  paymentWebhookSecret: nconf.get('PAYMENT_WEBHOOK_SECRET'),
  msg91AuthKey: nconf.get('AUTH_KEY'),
  msg91TemplateId: nconf.get('TEMPLATE_ID'),
  otpMode: nconf.get('OTP_MODE') as 'mock' | 'live',
  platformUpiVpa: nconf.get('PLATFORM_UPI_VPA'),
  platformPayeeName: nconf.get('PLATFORM_PAYEE_NAME')
};
