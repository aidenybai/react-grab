import { API_BASE_URL } from "@/lib/constants";

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    logout: `${API_BASE_URL}/auth/logout`,
    register: `${API_BASE_URL}/auth/register`,
    refresh: `${API_BASE_URL}/auth/refresh`,
    forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/auth/reset-password`,
    verify: `${API_BASE_URL}/auth/verify`,
  },
  users: {
    list: `${API_BASE_URL}/users`,
    byId: (id: string) => `${API_BASE_URL}/users/${id}`,
    me: `${API_BASE_URL}/users/me`,
    updateProfile: `${API_BASE_URL}/users/me/profile`,
    uploadAvatar: `${API_BASE_URL}/users/me/avatar`,
  },
  bookings: {
    list: `${API_BASE_URL}/bookings`,
    byId: (id: string) => `${API_BASE_URL}/bookings/${id}`,
    create: `${API_BASE_URL}/bookings`,
    cancel: (id: string) => `${API_BASE_URL}/bookings/${id}/cancel`,
  },
  analytics: {
    overview: `${API_BASE_URL}/analytics/overview`,
    traffic: `${API_BASE_URL}/analytics/traffic`,
    events: `${API_BASE_URL}/analytics/events`,
    export: `${API_BASE_URL}/analytics/export`,
  },
  integrations: {
    list: `${API_BASE_URL}/integrations`,
    byId: (id: string) => `${API_BASE_URL}/integrations/${id}`,
    connect: (provider: string) =>
      `${API_BASE_URL}/integrations/${provider}/connect`,
    disconnect: (provider: string) =>
      `${API_BASE_URL}/integrations/${provider}/disconnect`,
  },
  notifications: {
    list: `${API_BASE_URL}/notifications`,
    markRead: (id: string) => `${API_BASE_URL}/notifications/${id}/read`,
    markAllRead: `${API_BASE_URL}/notifications/read-all`,
    preferences: `${API_BASE_URL}/notifications/preferences`,
  },
  settings: {
    general: `${API_BASE_URL}/settings`,
    appearance: `${API_BASE_URL}/settings/appearance`,
    notifications: `${API_BASE_URL}/settings/notifications`,
  },
} as const;
