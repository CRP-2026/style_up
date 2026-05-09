function requireEnv(name: 'EXPO_PUBLIC_API_URL' | 'EXPO_PUBLIC_STORE_ID') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const raw = requireEnv('EXPO_PUBLIC_API_URL').replace(/\/$/, '');

export const API_BASE_URL = raw;

export const STORE_ID = requireEnv('EXPO_PUBLIC_STORE_ID');
