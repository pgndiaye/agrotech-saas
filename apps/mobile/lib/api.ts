import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('agrotech_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('agrotech_token');
      await AsyncStorage.removeItem('agrotech_user');
      onUnauthorizedCallback?.();
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const stocksApi = {
  getAll: () => api.get('/stocks'),
  getOne: (id: string) => api.get(`/stocks/${id}`),
  create: (data: any) => api.post('/stocks', data),
  update: (id: string, data: any) => api.put(`/stocks/${id}`, data),
  delete: (id: string) => api.delete(`/stocks/${id}`),
  addMovement: (id: string, data: any) => api.post(`/stocks/${id}/movements`, data),
  getStats: () => api.get('/stocks/stats'),
};

export const weatherApi = {
  getCurrent: (city?: string) => api.get('/weather', { params: { city } }),
  getForecast: (city?: string) => api.get('/weather/forecast', { params: { city } }),
};

export const financeApi = {
  getAll: (type?: string) => api.get('/finance', { params: { type } }),
  getSummary: () => api.get('/finance/summary'),
  getMonthly: () => api.get('/finance/monthly'),
  create: (data: any) => api.post('/finance', data),
  delete: (id: string) => api.delete(`/finance/${id}`),
};

export const marketplaceApi = {
  getAll: (category?: string) => api.get('/marketplace', { params: { category } }),
  getMy: () => api.get('/marketplace/my'),
  create: (data: any) => api.post('/marketplace', data),
  markSold: (id: string) => api.put(`/marketplace/${id}/sold`),
  delete: (id: string) => api.delete(`/marketplace/${id}`),
};

export const paymentsApi = {
  getProviders: () =>
    api.get<{ WAVE: boolean; ORANGE_MONEY: boolean; simulation: boolean }>('/payments/providers'),
  getSubscription: () => api.get('/payments/subscription'),
  getHistory: () => api.get('/payments/history'),
  initiate: (data: {
    provider: 'WAVE' | 'ORANGE_MONEY';
    amount: number;
    phoneNumber?: string;
  }) => api.post('/payments/initiate', data),
  simulateConfirm: (paymentId: string) =>
    api.post(`/payments/simulate-confirm/${paymentId}`),
};

export const aiApi = {
  getRecommendations: (city?: string) =>
    api.get('/ai/recommendations', { params: city ? { city } : {} }),
};

export const smsApi = {
  getConfig: () => api.get('/sms/config'),
  upsertConfig: (data: {
    phoneNumber: string;
    enabled?: boolean;
    city?: string;
    stockAlerts?: boolean;
    weatherAlerts?: boolean;
    financeAlerts?: boolean;
    weeklyDigest?: boolean;
  }) => api.put('/sms/config', data),
  sendTestSms: () => api.post('/sms/test'),
  triggerAlerts: () => api.post('/sms/trigger'),
  getLogs: () => api.get('/sms/logs'),
};

export default api;
