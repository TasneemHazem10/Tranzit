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

export type DriverOffer = {
  id: number;
  shipment_id: number;
  driver_id: number;
  amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired';
  created_at: string;
  driver?: Driver | null;
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
  vehicle_type?: string | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  payment_method: number;
  mobile_wallet_provider?: string | null;
  mobile_wallet_number?: string | null;
  mobile_wallet_status?: string | null;
  scheduled_at: string | null;
  price: number;
  distance_km: number | null;
  estimated_price?: number;
  payment_status?: 'pending' | 'paid' | 'refunded';
  paid_at?: string | null;
  notes: string | null;
  delivered_at: string | null;
  created_at: string;
  driver?: Driver | null;
  statuses?: ShipmentStatus[];
  offers?: DriverOffer[];
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
    request<OtpResponse>('/api/v1/otp/send', {
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

  googleLogin: (idToken: string) =>
    request<AuthResponse>('/api/v1/google/login', {
      method: 'POST',
      body: { id_token: idToken },
    }),

  me: (token: string) => request<{ user: User }>('/api/v1/me', { token }),

  updateProfile: (token: string, body: { name?: string; email?: string | null }) =>
    request<{ message: string; user: User }>('/api/v1/profile', {
      method: 'PUT',
      body,
      token,
    }),

  changePassword: (token: string, body: { current_password: string; password: string; password_confirmation: string }) =>
    request<{ message: string }>('/api/v1/password', {
      method: 'PUT',
      body,
      token,
    }),

  updatePushToken: (token: string, pushToken: string) =>
    request<{ message: string }>('/api/v1/push-token', {
      method: 'POST',
      body: { push_token: pushToken },
      token,
    }),

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
  package_type?: 'small' | 'medium' | 'large';
  vehicle_type?: 'trike' | 'small_car' | 'van' | 'truck' | null;
  distance_km?: number | null;
  estimated_duration_min?: number | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  payment_method: number;
  notes?: string | null;
};

export const shipmentsApi = {
  list: (token: string) =>
    request<{ shipments: Shipment[] }>('/api/v1/shipments', { token }),

  get: (token: string, code: string) =>
    request<{ shipment: Shipment }>(`/api/v1/shipments/${code}`, { token }),

  create: (token: string, input: CreateShipmentInput) =>
    request<{ message: string; shipment: Shipment; estimated_price?: number; distance_km?: number | null }>('/api/v1/shipments', {
      method: 'POST',
      body: input,
      token,
    }),

  estimate: (token: string, code: string) =>
    request<{
      estimated_price: number;
      distance_km: number | null;
      package_base: number;
      per_km: number;
      per_km_long: number;
      long_distance_km: number;
      rates: Record<string, { base: number; per_km: number; per_km_long: number }>;
      shipment: Shipment;
    }>(`/api/v1/shipments/${code}/estimate`, { token }),

  estimateLive: (
    token: string,
    input: {
      pickup_lat: number;
      pickup_lng: number;
      dropoff_lat: number;
      dropoff_lng: number;
      vehicle_type: 'trike' | 'small_car' | 'van' | 'truck';
      estimated_duration_min?: number | null;
    }
  ) =>
    request<{
      distance_km: number;
      estimated_price: number;
      package_base: number;
      per_km: number;
      per_km_long: number;
      long_distance_km: number;
      rates: Record<string, { base: number; per_km: number; per_km_long: number }>;
    }>('/api/v1/fare/estimate', { method: 'POST', body: input, token }),

  simulateOffer: (token: string, code: string, amount?: number) =>
    request<{ message: string; offer: DriverOffer; shipment: Shipment }>(
      `/api/v1/shipments/${code}/offers/simulate`,
      { method: 'POST', body: amount != null ? { amount } : {}, token }
    ),

  updateBid: (token: string, code: string, amount: number) =>
    request<{ message: string; shipment: Shipment }>(
      `/api/v1/shipments/${code}/bid`,
      { method: 'POST', body: { amount }, token }
    ),

  acceptOffer: (token: string, code: string, offerId: number) =>
    request<{ message: string; shipment: Shipment }>(
      `/api/v1/shipments/${code}/offers/${offerId}/accept`,
      { method: 'POST', token }
    ),

  declineOffer: (token: string, code: string, offerId: number) =>
    request<{ message: string; shipment: Shipment }>(
      `/api/v1/shipments/${code}/offers/${offerId}/decline`,
      { method: 'POST', token }
    ),

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

  cancel: (token: string, code: string, reason?: string) =>
    request<{ message: string; shipment: Shipment }>(
      `/api/v1/shipments/${code}/cancel`,
      { method: 'POST', body: reason ? { reason } : {}, token }
    ),
};
