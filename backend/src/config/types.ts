// Shape of config.<env>.json — one interface per top-level section, mirrored key-for-key by
// config_template.json (which index.ts checks every environment's file against at boot).

export interface IServer {
  port: number;
  /** Customer/owner app origin — CORS, socket origin, QR codes and checkout redirects. */
  frontendUrl: string;
  /** pino level: trace | debug | info | warn | error | fatal */
  logLevel: string;
}

export interface IMongo {
  /** Full connection string (e.g. Atlas mongodb+srv://). When non-empty it wins outright. */
  uri: string;
  host: string;
  port: number;
  dbName: string;
  /** e.g. "rs0". Set this (plus replicaHosts) to pivot to a replica set — no code change needed. */
  replicaSetName: string;
  /** Comma-separated "host:port,host:port" extra members, used only when replicaSetName is set. */
  replicaHosts: string;
}

export interface IDatabase {
  mongo: IMongo;
}

export interface IAuth {
  /** Anyone holding this can mint a SUPER_ADMIN token — production refuses a weak one. */
  jwtSecret: string;
  jwtExpiresIn: string;
}

export interface IOtp {
  /** 'mock' bypasses the MSG91 widget and echoes the OTP back in the API response. */
  mode: 'mock' | 'live';
  /**
   * Server-side only — validates the MSG91 OTP Widget's access token (otp.service.ts). The widget
   * itself uses a separate, restricted client-side token (VITE_MSG91_WIDGET_TOKEN), never this key.
   */
  msg91AuthKey: string;
}

/** The platform's own UPI ID, where businesses pay their commission dues (not a café's upiVpa). */
export interface IPlatform {
  upiVpa: string;
  payeeName: string;
}

/**
 * SMEPay Wizard Checkout — the optional per-business online checkout (services/checkout.service.ts).
 * Each café uses its own SMEPay merchant account, so money settles straight to the café.
 */
export interface ISmepay {
  /** Prod https://extranet.smepay.in, staging https://staging.smepay.in */
  baseUrl: string;
  /** Partner (TSP) API that creates a café's merchant account + KYC link from owner Settings. */
  partnerBaseUrl: string;
  /** Onboarding is unavailable until partnerCode/partnerEmail are set. */
  partnerCode: string;
  partnerEmail: string;
}

export interface ICheckout {
  /** How long an unpaid checkout is held before it's marked EXPIRED. */
  sessionTtlMinutes: number;
  /** How long after that the sweep keeps asking SMEPay (a late SUCCESS still creates the order). */
  lateGraceMinutes: number;
}

export interface IEncryption {
  /**
   * Encrypts each café's SMEPay client secret at rest (utils/secretBox.ts). Changing it makes every
   * stored secret unreadable — owners would have to re-enter their credentials.
   */
  credentialsKey: string;
}

export interface IAnalytics {
  /**
   * Leave businesses marked as demo (Business.isDemo) out of every platform-wide super admin
   * analytic, so internal test accounts don't inflate real GMV/orders/customers.
   */
  excludeDemoBusinesses: boolean;
}

export interface IS3 {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Only for S3-compatible stores (Cloudflare R2, MinIO); empty for AWS itself. */
  endpoint: string;
  /**
   * Public base URL objects are served from (CDN domain or the bucket's own URL). Empty means
   * https://<bucket>.s3.<region>.amazonaws.com. Must allow public reads — <img> tags can't sign.
   */
  publicBaseUrl: string;
}

/**
 * Where uploaded files (menu photos, profile pictures) live — services/storage. Files already
 * uploaded keep working after a switch: each URL is served by the store it was written to.
 */
export interface IStorage {
  driver: 'mongo' | 's3';
  s3: IS3;
}

/** The AI service (musicFck repo) that reads menu photos for the owner's "Upload Menu" import. */
export interface IAiService {
  url: string;
  /** Must match the AI service's SERVICE_API_KEY. */
  key: string;
  /** Keep a little above the AI service's own MENU_PIPELINE_TIMEOUT_SECONDS. */
  menuTimeoutMs: number;
}

/** Demo cafés (src/demo) — see demo.config.ts for how each value is clamped. */
export interface IDemo {
  /** Secret for the X-Demo-Key header; empty or < 24 chars = demo switched off. */
  tickKey: string;
  /** Password given to each demo café's owner and kitchen logins (≥ 8 chars). */
  accountPassword: string;
  /** Days of order history a newly created demo café starts with. */
  backfillDays: number;
  /** Older demo data is pruned once a day (at least 35, so every dashboard window stays covered). */
  keepDays: number;
  /** Where the kitchen bot reaches this backend's own API. Empty = http://127.0.0.1:<port>/api/v1 */
  apiBaseUrl: string;
}
