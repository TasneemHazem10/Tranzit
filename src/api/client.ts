import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * Resolve the Laravel API base URL.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL env var (create mobile/.env with EXPO_PUBLIC_API_URL=http://<your-pc-ip>:8000)
 *  2. Android emulator -> host machine loopback alias
 *  3. Physical device -> assumes this constant was edited with your PC LAN IP
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;

  if (Platform.OS === 'web') {
    const hostname = globalThis.location?.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (fromEnv && !isLocalHost) return fromEnv.replace(/\/$/, '');
    return `http://${hostname || 'localhost'}:8000`;
  }

  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:8000';
  }

  // TODO: replace with your computer LAN IP when testing on a real phone
  return 'http://192.168.1.100:8000';
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  formData?: FormData;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!options.formData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError('تعذر الاتصال بالسيرفر. تأكد أن XAMPP وسيرفر Laravel يعملان.', 0);
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    /* non-json response */
  }

  if (!response.ok) {
    const message =
      json?.message ??
      json?.error ??
      `حدث خطأ غير متوقع (${response.status}).`;
    throw new ApiError(message, response.status, json?.errors);
  }

  return json as T;
}
