type NodeEnvironment = 'development' | 'test' | 'production';

type ValidatedEnvironment = {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  API_PREFIX: string;
  FRONTEND_ORIGIN: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  SESSION_COOKIE_NAME: string;
  CSRF_COOKIE_NAME: string;
  GUEST_COOKIE_NAME: string;
  GUEST_COOKIE_SECRET: string;
  GUEST_TTL_SECONDS: number;
  SESSION_TTL_SECONDS: number;
  REMEMBER_ME_TTL_SECONDS: number;
  COOKIE_SECURE: boolean;
  COOKIE_DOMAIN?: string;
  UPLOAD_MAX_IMAGE_BYTES: number;
  UPLOAD_ALLOWED_FOLDERS: string;
  ADMIN_BOOTSTRAP_ENABLED: boolean;
  ADMIN_BOOTSTRAP_NAME?: string;
  ADMIN_BOOTSTRAP_EMAIL?: string;
  ADMIN_BOOTSTRAP_PHONE?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  SHEIN_IMPORT_COUNTRY_CODE: string;
  SHEIN_IMPORT_CURRENCY: string;
  SHEIN_IMPORT_LANGUAGE: string;
  SHEIN_BROWSER_IMPORT: string;
  SHEIN_BROWSER_PATH?: string;
  SHEIN_BROWSER_TIMEOUT_MS: string;
  SHEIN_ASSIST_HEADLESS?: string;
  SHEIN_ASSIST_MAX_WAIT_MS?: string;
  SHEIN_ASSIST_POLL_MS?: string;
  SHEIN_ASSIST_PROFILE?: string;
  SHEIN_ASSIST_JOB_TTL_MS?: string;
  SHEIN_ASSIST_STALE_MS?: string;
  SHEIN_CUSTOMER_CURRENCY?: string;
  SHEIN_SAR_TO_EGP_RATE?: string;
  SHEIN_IMPORT_PRICE_RATE?: string;
};

const requiredStringKeys = [
  'API_PREFIX',
  'FRONTEND_ORIGIN',
  'DATABASE_URL',
  'REDIS_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

const placeholderValues = new Set([
  'replace_me',
  'demo',
  'demo_cloud_name',
  'demo_api_key',
  'demo_api_secret',
]);

function requirePositiveInteger(key: string, value: unknown, fallback: number): number {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsedValue;
}

function optionalString(value: unknown, fallback: string): string {
  const parsedValue = String(value ?? fallback).trim();
  if (!parsedValue) {
    return fallback;
  }

  return parsedValue;
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
}

function optionalTrimmed(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validateUrl(key: string, value: string, nodeEnvironment: NodeEnvironment): void {
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(`${key} must include at least one URL`);
  }

  for (const item of values) {
    try {
      const url = new URL(item);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error();
      }
      if (nodeEnvironment === 'production' && url.protocol !== 'https:') {
        throw new Error(`${key} must use HTTPS in production`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('HTTPS')) {
        throw error;
      }
      throw new Error(`${key} must be a comma-separated list of valid http or https URLs`);
    }
  }
}

function validateRedisUrl(value: string): void {
  try {
    const url = new URL(value);
    if (!['redis:', 'rediss:'].includes(url.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error('REDIS_URL must be a valid redis or rediss URL');
  }
}

function validateDatabaseUrl(value: string): void {
  if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string');
  }
}

function validateApiPrefix(value: string): void {
  if (value.startsWith('/') || value.endsWith('/')) {
    throw new Error('API_PREFIX must not start or end with a slash');
  }
}

function assertNotPlaceholder(key: string, value: string, nodeEnvironment: NodeEnvironment): void {
  const normalized = value.trim().toLowerCase();
  if (nodeEnvironment === 'production' && placeholderValues.has(normalized)) {
    throw new Error(`${key} must not use a placeholder value in production`);
  }
}

function validateFolders(value: string): string {
  const folders = value
    .split(',')
    .map((folder) => folder.trim())
    .filter(Boolean);

  if (folders.length === 0) {
    throw new Error('UPLOAD_ALLOWED_FOLDERS must include at least one folder');
  }

  for (const folder of folders) {
    if (!folder.startsWith('rs-store/') || folder.includes('..') || folder.includes('//')) {
      throw new Error('UPLOAD_ALLOWED_FOLDERS entries must be safe rs-store/* folder paths');
    }
  }

  return folders.join(',');
}

function validateBootstrap(
  config: Record<string, unknown>,
  nodeEnvironment: NodeEnvironment,
): Partial<ValidatedEnvironment> {
  const enabled = optionalBoolean(config.ADMIN_BOOTSTRAP_ENABLED, false);
  const name = optionalTrimmed(config.ADMIN_BOOTSTRAP_NAME);
  const email = optionalTrimmed(config.ADMIN_BOOTSTRAP_EMAIL);
  const phone = optionalTrimmed(config.ADMIN_BOOTSTRAP_PHONE);
  const password = optionalTrimmed(config.ADMIN_BOOTSTRAP_PASSWORD);

  if (!enabled) {
    return { ADMIN_BOOTSTRAP_ENABLED: false };
  }

  const missing = [
    ['ADMIN_BOOTSTRAP_NAME', name],
    ['ADMIN_BOOTSTRAP_EMAIL', email],
    ['ADMIN_BOOTSTRAP_PHONE', phone],
    ['ADMIN_BOOTSTRAP_PASSWORD', password],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing admin bootstrap variables: ${missing.join(', ')}`);
  }

  if (!email?.includes('@')) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email address');
  }

  if (!/^\+?[0-9]{8,15}$/.test(phone ?? '')) {
    throw new Error('ADMIN_BOOTSTRAP_PHONE must contain 8 to 15 digits and may start with +');
  }

  if (
    (password?.length ?? 0) < 12 ||
    /^(?:admin|password|12345678|123456789|rsstore)$/i.test(password ?? '')
  ) {
    throw new Error(
      'ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters and not a weak default',
    );
  }

  if (nodeEnvironment === 'production' && password === 'ChangeMe12345!') {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must not use the example value in production');
  }

  return {
    ADMIN_BOOTSTRAP_ENABLED: true,
    ADMIN_BOOTSTRAP_NAME: name,
    ADMIN_BOOTSTRAP_EMAIL: email,
    ADMIN_BOOTSTRAP_PHONE: phone,
    ADMIN_BOOTSTRAP_PASSWORD: password,
  };
}

function normalizeSheinCountryEnv(value: unknown): string {
  const country = optionalString(value, 'KW').toUpperCase();
  if (!['KW', 'SA', 'AE', 'QA', 'BH', 'OM'].includes(country)) {
    throw new Error('SHEIN_IMPORT_COUNTRY_CODE must be one of KW, SA, AE, QA, BH, OM');
  }
  return country;
}

function normalizeSheinLanguageEnv(value: unknown): string {
  const language = optionalString(value, 'ar').toLowerCase();
  if (!['ar', 'en'].includes(language)) {
    throw new Error('SHEIN_IMPORT_LANGUAGE must be ar or en');
  }
  return language;
}

export function validateEnvironment(config: Record<string, unknown>): ValidatedEnvironment {
  const missingKeys = requiredStringKeys.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  const nodeEnvironment = String(config.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development test or production');
  }

  const typedNodeEnvironment = nodeEnvironment as NodeEnvironment;
  const port = requirePositiveInteger('PORT', config.PORT, 3000);
  if (port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const apiPrefix = String(config.API_PREFIX);
  const frontendOrigin = String(config.FRONTEND_ORIGIN);
  const databaseUrl = String(config.DATABASE_URL);
  const redisUrl = String(config.REDIS_URL);
  const cloudinaryCloudName = String(config.CLOUDINARY_CLOUD_NAME);
  const cloudinaryApiKey = String(config.CLOUDINARY_API_KEY);
  const cloudinaryApiSecret = String(config.CLOUDINARY_API_SECRET);
  const cookieSecure = optionalBoolean(config.COOKIE_SECURE, typedNodeEnvironment === 'production');
  const cookieDomain = optionalTrimmed(config.COOKIE_DOMAIN);
  const sessionTtlSeconds = requirePositiveInteger(
    'SESSION_TTL_SECONDS',
    config.SESSION_TTL_SECONDS,
    8 * 60 * 60,
  );
  const rememberMeTtlSeconds = requirePositiveInteger(
    'REMEMBER_ME_TTL_SECONDS',
    config.REMEMBER_ME_TTL_SECONDS,
    30 * 24 * 60 * 60,
  );
  const guestTtlSeconds = requirePositiveInteger(
    'GUEST_TTL_SECONDS',
    config.GUEST_TTL_SECONDS,
    30 * 24 * 60 * 60,
  );
  const guestCookieSecret = optionalString(
    config.GUEST_COOKIE_SECRET,
    'development_guest_cookie_secret_change_me',
  );

  validateApiPrefix(apiPrefix);
  validateUrl('FRONTEND_ORIGIN', frontendOrigin, typedNodeEnvironment);
  validateDatabaseUrl(databaseUrl);
  validateRedisUrl(redisUrl);
  assertNotPlaceholder('CLOUDINARY_CLOUD_NAME', cloudinaryCloudName, typedNodeEnvironment);
  assertNotPlaceholder('CLOUDINARY_API_KEY', cloudinaryApiKey, typedNodeEnvironment);
  assertNotPlaceholder('CLOUDINARY_API_SECRET', cloudinaryApiSecret, typedNodeEnvironment);

  if (typedNodeEnvironment === 'production' && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be true in production');
  }

  if (typedNodeEnvironment === 'production') {
    if (
      guestCookieSecret.length < 32 ||
      guestCookieSecret === 'development_guest_cookie_secret_change_me'
    ) {
      throw new Error(
        'GUEST_COOKIE_SECRET must be at least 32 characters and not use the development default in production',
      );
    }
  }

  if (rememberMeTtlSeconds <= sessionTtlSeconds) {
    throw new Error('REMEMBER_ME_TTL_SECONDS must be greater than SESSION_TTL_SECONDS');
  }

  const uploadMaxImageBytes = requirePositiveInteger(
    'UPLOAD_MAX_IMAGE_BYTES',
    config.UPLOAD_MAX_IMAGE_BYTES,
    5 * 1024 * 1024,
  );
  if (uploadMaxImageBytes > 10 * 1024 * 1024) {
    throw new Error('UPLOAD_MAX_IMAGE_BYTES must not exceed 10485760');
  }

  const uploadAllowedFolders = validateFolders(
    optionalString(
      config.UPLOAD_ALLOWED_FOLDERS,
      'rs-store/products,rs-store/categories,rs-store/settings,rs-store/order-proofs,rs-store/shein-imports',
    ),
  );
  const bootstrapConfig = validateBootstrap(config, typedNodeEnvironment);
  const sheinImportCurrency = optionalString(config.SHEIN_IMPORT_CURRENCY, 'SAR').toUpperCase();
  if (sheinImportCurrency !== 'SAR') {
    throw new Error('SHEIN_IMPORT_CURRENCY must be SAR');
  }

  return {
    NODE_ENV: typedNodeEnvironment,
    PORT: port,
    API_PREFIX: apiPrefix,
    FRONTEND_ORIGIN: frontendOrigin,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    CLOUDINARY_CLOUD_NAME: cloudinaryCloudName,
    CLOUDINARY_API_KEY: cloudinaryApiKey,
    CLOUDINARY_API_SECRET: cloudinaryApiSecret,
    SESSION_COOKIE_NAME: optionalString(config.SESSION_COOKIE_NAME, 'rs_session'),
    CSRF_COOKIE_NAME: optionalString(config.CSRF_COOKIE_NAME, 'rs_csrf'),
    GUEST_COOKIE_NAME: optionalString(config.GUEST_COOKIE_NAME, 'rs_guest'),
    GUEST_COOKIE_SECRET: guestCookieSecret,
    GUEST_TTL_SECONDS: guestTtlSeconds,
    SESSION_TTL_SECONDS: sessionTtlSeconds,
    REMEMBER_ME_TTL_SECONDS: rememberMeTtlSeconds,
    COOKIE_SECURE: cookieSecure,
    COOKIE_DOMAIN: cookieDomain,
    UPLOAD_MAX_IMAGE_BYTES: uploadMaxImageBytes,
    UPLOAD_ALLOWED_FOLDERS: uploadAllowedFolders,
    ADMIN_BOOTSTRAP_ENABLED: bootstrapConfig.ADMIN_BOOTSTRAP_ENABLED ?? false,
    ADMIN_BOOTSTRAP_NAME: bootstrapConfig.ADMIN_BOOTSTRAP_NAME,
    ADMIN_BOOTSTRAP_EMAIL: bootstrapConfig.ADMIN_BOOTSTRAP_EMAIL,
    ADMIN_BOOTSTRAP_PHONE: bootstrapConfig.ADMIN_BOOTSTRAP_PHONE,
    ADMIN_BOOTSTRAP_PASSWORD: bootstrapConfig.ADMIN_BOOTSTRAP_PASSWORD,
    SHEIN_IMPORT_COUNTRY_CODE: normalizeSheinCountryEnv(config.SHEIN_IMPORT_COUNTRY_CODE),
    SHEIN_IMPORT_CURRENCY: sheinImportCurrency,
    SHEIN_IMPORT_LANGUAGE: normalizeSheinLanguageEnv(config.SHEIN_IMPORT_LANGUAGE),
    SHEIN_BROWSER_IMPORT: optionalString(config.SHEIN_BROWSER_IMPORT, 'interactive'),
    SHEIN_BROWSER_PATH: optionalTrimmed(config.SHEIN_BROWSER_PATH),
    SHEIN_BROWSER_TIMEOUT_MS: optionalString(config.SHEIN_BROWSER_TIMEOUT_MS, '6000'),
    SHEIN_ASSIST_HEADLESS: optionalTrimmed(config.SHEIN_ASSIST_HEADLESS),
    SHEIN_ASSIST_MAX_WAIT_MS: optionalTrimmed(config.SHEIN_ASSIST_MAX_WAIT_MS),
    SHEIN_ASSIST_POLL_MS: optionalTrimmed(config.SHEIN_ASSIST_POLL_MS),
    SHEIN_ASSIST_PROFILE: optionalTrimmed(config.SHEIN_ASSIST_PROFILE),
    SHEIN_ASSIST_JOB_TTL_MS: optionalTrimmed(config.SHEIN_ASSIST_JOB_TTL_MS),
    SHEIN_ASSIST_STALE_MS: optionalTrimmed(config.SHEIN_ASSIST_STALE_MS),
    SHEIN_CUSTOMER_CURRENCY: optionalTrimmed(config.SHEIN_CUSTOMER_CURRENCY),
    SHEIN_SAR_TO_EGP_RATE: optionalTrimmed(config.SHEIN_SAR_TO_EGP_RATE),
    SHEIN_IMPORT_PRICE_RATE: optionalTrimmed(config.SHEIN_IMPORT_PRICE_RATE),
  };
}
