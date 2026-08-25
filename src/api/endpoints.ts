import { request } from './client';

export type User = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  phone_verified_at: string | null;
};

export type OtpResponse = {
  message: string;
  needs_otp?: boolean;
  phone?: string;
  debug_code?: string | null;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: User;
};

export type ShipmentStatus = {
  id: number;
  status: string;
  note: string | null;
  occurred_at: string;
};

export type Driver = {
  id: number;
  name: string;
  phone: string;
  rating_avg: number;
  total_trips: number;
  vehicle_type: string;
  vehicle_plate: string;
  lat: number | null;
  lng: number | null;
};

export type Rating = {
  id: number;
  stars: number;
  comment: string | null;
};

export type Shipment = {
  id: number;
  tracking_code: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'canceled';
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  package_type: 'small' | 'medium' | 'large';
  payment_method: number;
  scheduled_at: string | null;
  price: number;
  notes: string | null;
  delivered_at: string | null;
  created_at: string;
  driver?: Driver | null;
  statuses?: ShipmentStatus[];
  rating?: Rating | null;
  proof_photo_url?: string | null;
  signature_url?: string | null;
};

/* ---------------- Auth ---------------- */

export const authApi = {
  login: (phone: string, password: string) =>
    request<OtpResponse>('/api/v1/login', { method: 'POST', body: { phone, password } }),

  register: (name: string, phone: string, password: string, passwordConfirmation: string) =>
    request<OtpResponse>('/api/v1/register', {
      method: 'POST',
      body: {
        name,
        phone,
        password,
        password_confirmation: passwordConfirmation,
      },
    }),

  verifyOtp: (phone: string, code: string, purpose: string) =>
    request<AuthResponse>('/api/v1/otp/verify', {
      method: 'POST',
      body: { phone, code, purpose },
    }),

  resendOtp: (phone: string, purpose: string) =>
    request<{ message: string; debug_code?: string | null }>('/api/v1/otp/send', {
      method: 'POST',
      body: { phone, purpose },
    }),

  forgotPassword: (phone: string) =>
    request<OtpResponse>('/api/v1/forgot-password', { method: 'POST', body: { phone } }),

  resetPassword: (phone: string, code: string, password: string, passwordConfirmation: string) =>
    request<{ message: string }>('/api/v1/reset-password', {
      method: 'POST',
      body: { phone, code, password, password_confirmation: passwordConfirmation },
    }),

  me: (token: string) => request<{ user: User }>('/api/v1/me', { token }),

  logout: (token: string) => request<{ message: string }>('/api/v1/logout', { method: 'POST', token }),
};

/* ---------------- Shipments ---------------- */

export type CreateShipmentInput = {
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_address: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  package_type: 'small' | 'medium' | 'large';
  payment_method: number;
  scheduled_at?: string | null;
  notes?: string | null;
};

export const shipmentsApi = {
  list: (token: string) =>
    request<{ shipments: Shipment[] }>('/api/v1/shipments', { token }),

  get: (token: string, code: string) =>
    request<{ shipment: Shipment }>(`/api/v1/shipments/${code}`, { token }),

  create: (token: string, input: CreateShipmentInput) =>
    request<{ message: string; shipment: Shipment }>('/api/v1/shipments', {
      method: 'POST',
      body: input,
      token,
    }),

  confirmDelivery: (token: string, code: string, form: FormData) =>
    request<{ message: string; shipment: Shipment }>(
      `/api/v1/shipments/${code}/confirm-delivery`,
      { method: 'POST', formData: form, token }
    ),

  rate: (token: string, code: string, stars: number, comment?: string) =>
    request<{ message: string; rating: Rating; driver: Driver }>(
      `/api/v1/shipments/${code}/rate`,
      { method: 'POST', body: { stars, comment }, token }
    ),

  advance: (token: string, code: string) =>
    request<{ message: string; shipment: Shipment }>(
      `/api/v1/shipments/${code}/advance`,
      { method: 'POST', token }
    ),
};

/* ---------------- Messages ---------------- */

export type Message = {
  id: number;
  body: string;
  is_from_driver: boolean;
  created_at: string;
};

export const messagesApi = {
  list: (token: string, driverId: string) =>
    request<{ messages: Message[] }>(`/api/v1/messages/${driverId}`, { token }),

  send: (token: string, driverId: string, body: string) =>
    request<{ message: Message }>(`/api/v1/messages/${driverId}`, {
      method: 'POST', body: { body }, token
    }),
};

/* ---------------- Wallet ---------------- */

export type WalletTransaction = {
  id: number;
  type: string;
  amount: string;
  description: string | null;
  created_at: string;
};

export const walletApi = {
  get: (token: string) =>
    request<{ balance: number; transactions: WalletTransaction[] }>('/api/v1/wallet', { token }),

  topup: (token: string, amount: number) =>
    request<{ message: string; balance: number; transaction: WalletTransaction }>('/api/v1/wallet/topup', {
      method: 'POST', body: { amount }, token
    }),
};

/* ---------------- Notifications ---------------- */

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export const notificationsApi = {
  list: (token: string) =>
    request<{ notifications: AppNotification[] }>('/api/v1/notifications', { token }),

  markRead: (token: string, id: number) =>
    request<{ message: string }>(`/api/v1/notifications/${id}/read`, { method: 'POST', token }),

  markAllRead: (token: string) =>
    request<{ message: string }>('/api/v1/notifications/read-all', { method: 'POST', token }),
};

/* ---------------- Driver Registration ---------------- */

export const driverApi = {
  register: (formData: FormData) =>
    request<{ message: string; driver: any }>('/api/v1/driver/register', { method: 'POST', formData }),
};
