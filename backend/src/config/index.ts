import fs from 'fs';
import path from 'path';
import nconf from 'nconf';
import { APP_NAME, APP_SLUG } from './constants';

// NODE_ENV alone still comes from a real process env var (never a .env file) — it's the
// bootstrap flag that picks which config.<env>.json to load below, so it can't itself
// live inside one of those files without a chicken-and-egg problem.
const env = process.env.NODE_ENV || 'development';

// Precedence (highest first): CLI args > this environment's config.<env>.json (lives
// next to this file, in config/) > hardcoded defaults below. No .env file and no other
// process-env values are read for config — every setting other than NODE_ENV comes from
// config.<env>.json or the defaults() block, so the whole app's config lives in
// checked-in/local files.
nconf.argv();

const envConfigPath = path.join(__dirname, `config.${env}.json`);
if (fs.existsSync(envConfigPath)) {
  nconf.file('environment', { file: envConfigPath });
}

nconf.defaults({
  PORT: 5000,
  NODE_ENV: 'development',
  // MONGO_URI, when set, is a full connection string (e.g. an Atlas mongodb+srv:// URI) and
  // wins outright — see buildMongoUri() below. It has no default here (unlike every other
  // key) specifically so its absence can be detected and the MONGO_HOST/PORT/DB_NAME/replica
  // knobs below used to build one instead.
  MONGO_HOST: '127.0.0.1',
  MONGO_PORT: 27017,
  MONGO_DB_NAME: APP_SLUG,
  // Comma-separated "host:port,host:port" additional replica set members, appended to
  // MONGO_HOST:MONGO_PORT when MONGO_REPLICA_SET_NAME is also set. Empty = single node.
  MONGO_REPLICA_HOSTS: '',
  // e.g. "rs0". Set this (plus MONGO_REPLICA_HOSTS) to pivot to a replica set later —
  // no code change needed, see buildMongoUri() and database/index.ts's connect options.
  MONGO_REPLICA_SET_NAME: '',
  JWT_SECRET: `${APP_SLUG}_super_secret_jwt_key_2026_production_ready`,
  JWT_EXPIRES_IN: '7d',
  FRONTEND_URL: 'http://localhost:5173',
  PAYMENT_WEBHOOK_SECRET: `whsec_${APP_SLUG}_mock_secret`,
  // Server-side only — used solely to validate the MSG91 OTP Widget's access token
  // (see otp.service.ts). The widget itself is configured client-side with a separate,
  // restricted widget token (VITE_MSG91_WIDGET_TOKEN), never this key.
  AUTH_KEY: '570575TJIuw946StnY6aa5763eP1',
  // 'mock' bypasses the MSG91 widget entirely and echoes the OTP back in the API response,
  // so local dev/debugging works without widget credentials or spending SMS credits.
  // Defaults to mock everywhere except production; set OTP_MODE=live (env, or in a
  // config.<env>.json) to force the real widget on somewhere other than prod (e.g. a
  // pre-prod staging env that wants to test the real integration).
  OTP_MODE: env === 'production' ? 'live' : 'mock',
  // Platform's own UPI ID — where businesses pay their commission dues. Distinct from any
  // business's own upiVpa (that one collects customer payments, this one collects ours).
  PLATFORM_UPI_VPA: `${APP_SLUG}@okhdfcbank`,
  PLATFORM_PAYEE_NAME: `${APP_NAME} Technologies`,
  // Leave businesses a super admin has marked as demo (Business.isDemo) out of every
  // platform-wide super admin analytic. On in production so internal test accounts don't
  // inflate real GMV/orders/customers; off elsewhere so local dev still sees the seeded data.
  // Set to false (config.<env>.json or --EXCLUDE_DEMO_BUSINESSES_FROM_ANALYTICS=false) to disable.
  EXCLUDE_DEMO_BUSINESSES_FROM_ANALYTICS: env === 'production'
});

// Builds a Mongo connection string from MONGO_HOST/PORT/DB_NAME (+ optional replica set
// members) when MONGO_URI isn't explicitly set. An explicit MONGO_URI (e.g. an Atlas
// mongodb+srv:// string, which encodes its own topology) always wins outright.
const buildMongoUri = (): string => {
  const explicitUri = nconf.get('MONGO_URI');
  if (explicitUri) return explicitUri;

  const primaryMember = `${nconf.get('MONGO_HOST')}:${nconf.get('MONGO_PORT')}`;
  const replicaSetName = nconf.get('MONGO_REPLICA_SET_NAME');
  const replicaHosts: string[] = replicaSetName
    ? String(nconf.get('MONGO_REPLICA_HOSTS') || '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean)
    : [];

  const members = [primaryMember, ...replicaHosts].join(',');
  return `mongodb://${members}/${nconf.get('MONGO_DB_NAME')}`;
};

// Same shape as before nconf — every call site elsewhere in the app is untouched.
export const config = {
  port: nconf.get('PORT'),
  nodeEnv: env,
  mongoUri: buildMongoUri(),
  // Set only when MONGO_REPLICA_SET_NAME is configured — database/index.ts uses its
  // presence to decide whether to pass replicaSet/readPreference connect options.
  mongoReplicaSetName: (nconf.get('MONGO_REPLICA_SET_NAME') as string) || undefined,
  jwtSecret: nconf.get('JWT_SECRET'),
  jwtExpiresIn: nconf.get('JWT_EXPIRES_IN'),
  frontendUrl: nconf.get('FRONTEND_URL'),
  paymentWebhookSecret: nconf.get('PAYMENT_WEBHOOK_SECRET'),
  msg91AuthKey: nconf.get('AUTH_KEY'),
  otpMode: nconf.get('OTP_MODE') as 'mock' | 'live',
  platformUpiVpa: nconf.get('PLATFORM_UPI_VPA'),
  platformPayeeName: nconf.get('PLATFORM_PAYEE_NAME'),
  // String() because a CLI override arrives as the string "false", not a boolean.
  excludeDemoBusinessesFromAnalytics: String(nconf.get('EXCLUDE_DEMO_BUSINESSES_FROM_ANALYTICS')) === 'true'
};