import fs from 'fs';
import path from 'path';
import nconf from 'nconf';
import template from './config_template.json';
import type {
  IAiService,
  IAnalytics,
  IAuth,
  ICafeIdentity,
  ICheckout,
  IDatabase,
  IDemo,
  IEncryption,
  INotifications,
  IOtp,
  IPlatform,
  IServer,
  ISmepay,
  IStorage
} from './types';

// NODE_ENV alone still comes from a real process env var (never a .env file) — it's the
// bootstrap flag that picks which config.<env>.json to load below, so it can't itself
// live inside one of those files without a chicken-and-egg problem.
const env = process.env.NODE_ENV || 'development';

// config.<env>.json (next to this file) is the one source of every setting — there are no
// fallback defaults in code and no other process-env values are read. CLI args override it,
// nested with ':' (e.g. `--server:port=5001`); parseValues turns "false"/"15" into real values.
//
// To add a setting: add it to config_template.json and types.ts, then to every
// config.<env>.json. Boot fails, naming the key, in any environment whose file lacks it.
const envConfigPath = path.join(__dirname, `config.${env}.json`);
if (!fs.existsSync(envConfigPath)) {
  throw new Error(`No config file for NODE_ENV=${env}: create ${envConfigPath} from config_template.json.`);
}
nconf.argv({ parseValues: true }).file('environment', { file: envConfigPath });

const missingKeys = (shape: object, prefix = ''): string[] =>
  Object.entries(shape).flatMap(([key, value]) => {
    const keyPath = `${prefix}${key}`;
    if (value !== null && typeof value === 'object') return missingKeys(value, `${keyPath}:`);
    return nconf.get(keyPath) === undefined ? [keyPath] : [];
  });

const missing = missingKeys(template);
if (missing.length) {
  throw new Error(`config.${env}.json is missing ${missing.join(', ')} (see config_template.json).`);
}

const assertOneOf = (keyPath: string, allowed: readonly string[]) => {
  const value = nconf.get(keyPath);
  if (!allowed.includes(value)) {
    throw new Error(`config.${env}.json ${keyPath} is ${JSON.stringify(value)}; expected one of ${allowed.join(' | ')}.`);
  }
};
assertOneOf('otp:mode', ['mock', 'live']);
assertOneOf('storage:driver', ['mongo', 's3']);
assertOneOf('cafeIdentity:mascotRendering', ['heavy', 'light']);

// Anyone who knows the JWT secret can mint a token for any user — including SUPER_ADMIN — so
// production refuses to boot with a weak one. The "_super_secret_jwt_key_2026_production_ready"
// family was the old in-code default and has been in git history under more than one APP_SLUG,
// so it's public knowledge whatever prefix it carries.
const assertJwtSecret = (secret: unknown) => {
  if (typeof secret !== 'string' || !secret) {
    throw new Error(`auth:jwtSecret in config.${env}.json is empty — tokens can't be signed without it.`);
  }
  if (env !== 'production') return;
  if (secret.length < 32 || secret.endsWith('_super_secret_jwt_key_2026_production_ready')) {
    throw new Error(
      'auth:jwtSecret in config.production.json is shorter than 32 characters or the publicly known default. ' +
        'Set it to a long random value (e.g. `node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"`).'
    );
  }
};
assertJwtSecret(nconf.get('auth:jwtSecret'));

// Each section is a plain object (nconf.get hands back a copy), so tests can override a field
// in place — e.g. `storage.driver = 's3'` — without touching nconf.
export const runtime = { nodeEnv: env };
export const server = nconf.get('server') as IServer;
export const database = nconf.get('database') as IDatabase;
export const auth = nconf.get('auth') as IAuth;
export const otp = nconf.get('otp') as IOtp;
export const platform = nconf.get('platform') as IPlatform;
export const smepay = nconf.get('smepay') as ISmepay;
export const checkout = nconf.get('checkout') as ICheckout;
export const encryption = nconf.get('encryption') as IEncryption;
export const analytics = nconf.get('analytics') as IAnalytics;
export const storage = nconf.get('storage') as IStorage;
export const aiService = nconf.get('aiService') as IAiService;
export const demo = nconf.get('demo') as IDemo;
export const cafeIdentity = nconf.get('cafeIdentity') as ICafeIdentity;
export const notifications = nconf.get('notifications') as INotifications;

aiService.url = aiService.url.replace(/\/+$/, '');

// Builds a Mongo connection string from host/port/dbName (+ optional replica set members) when
// database.mongo.uri is empty. An explicit uri (e.g. an Atlas mongodb+srv:// string, which
// encodes its own topology) always wins outright.
const buildMongoUri = ({ uri, host, port, dbName, replicaSetName, replicaHosts }: IDatabase['mongo']): string => {
  if (uri) return uri;

  const extraMembers = replicaSetName
    ? replicaHosts
        .split(',')
        .map((member) => member.trim())
        .filter(Boolean)
    : [];
  return `mongodb://${[`${host}:${port}`, ...extraMembers].join(',')}/${dbName}`;
};

export const mongoUri = buildMongoUri(database.mongo);
