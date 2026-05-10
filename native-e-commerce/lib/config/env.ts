import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PATH_SUFFIX = '/api/v1';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function requireStoreId(): string {
  const value = process.env.EXPO_PUBLIC_STORE_ID?.trim();
  if (!value) {
    throw new Error('Missing required environment variable: EXPO_PUBLIC_STORE_ID');
  }
  return value;
}

/** Cổng API local; chỉ dùng khi suy ra URL từ host Expo (mặc định 8000). */
function devApiPort(): string {
  return (process.env.EXPO_PUBLIC_DEV_API_PORT ?? '8000').trim() || '8000';
}

function parseHostnameFromHostField(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const noProto = trimmed.replace(/^https?:\/\//i, '');
  const host = noProto.split(':')[0]?.trim();
  return host || null;
}

/** Máy ảo Android: localhost trên máy dev → 10.0.2.2 */
function normalizeHostForDevice(hostname: string): string {
  if (Platform.OS === 'android' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return '10.0.2.2';
  }
  return hostname;
}

/**
 * Host máy chạy Metro (thường cùng máy với API) — đổi Wi‑Fi thì Expo cập nhật theo lần start mới.
 */
function inferDevHostnameFromExpo(): string | null {
  const expoCfg = Constants.expoConfig as { hostUri?: string } | null | undefined;
  if (expoCfg?.hostUri) {
    const h = parseHostnameFromHostField(expoCfg.hostUri);
    if (h) return normalizeHostForDevice(h);
  }
  const go = Constants.expoGoConfig as { debuggerHost?: string } | null | undefined;
  if (go?.debuggerHost) {
    const h = parseHostnameFromHostField(go.debuggerHost);
    if (h) return normalizeHostForDevice(h);
  }
  const legacy = Constants.manifest as { hostUri?: string; debuggerHost?: string } | null | undefined;
  if (legacy?.hostUri) {
    const h = parseHostnameFromHostField(legacy.hostUri);
    if (h) return normalizeHostForDevice(h);
  }
  if (legacy?.debuggerHost) {
    const h = parseHostnameFromHostField(legacy.debuggerHost);
    if (h) return normalizeHostForDevice(h);
  }
  return null;
}

function inferDevApiBaseUrl(): string | null {
  const hostname = inferDevHostnameFromExpo();
  if (!hostname) return null;
  const port = devApiPort();
  return normalizeBaseUrl(`http://${hostname}:${port}${API_PATH_SUFFIX}`);
}

const explicitUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

let resolvedBase: string;
if (explicitUrl) {
  resolvedBase = normalizeBaseUrl(explicitUrl);
} else if (__DEV__) {
  const inferred = inferDevApiBaseUrl();
  if (!inferred) {
    throw new Error(
      '[env] EXPO_PUBLIC_API_URL chưa đặt và không suy ra được host từ Expo. ' +
        'Chạy `expo start` (LAN), hoặc đặt EXPO_PUBLIC_API_URL, hoặc EXPO_PUBLIC_DEV_API_PORT nếu API không chạy cổng 8000.'
    );
  }
  resolvedBase = inferred;
  console.log(`[env] API_BASE_URL (dev, inferred): ${resolvedBase}`);
} else {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL. Production / release bắt buộc cấu hình URL API cố định.'
  );
}

export const API_BASE_URL = resolvedBase;

export const STORE_ID = requireStoreId();

/** Đồ án: sau khi đóng trình duyệt VNPAY, gọi API mock để ghi nhận paid (bật cùng VNPAY_ALLOW_MOCK trên BE). */
export const VNPAY_MOCK_CALLBACK = ['1', 'true', 'yes'].includes(
  (process.env.EXPO_PUBLIC_VNPAY_MOCK || '').trim().toLowerCase()
);
