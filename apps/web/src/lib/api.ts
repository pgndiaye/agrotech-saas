import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('agrotech_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('agrotech_token');
      localStorage.removeItem('agrotech_user');
      window.location.href = '/login';
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
  exportCsv: () => api.get('/finance/export/csv', { responseType: 'blob' }),
};

export const marketplaceApi = {
  getAll: (category?: string) => api.get('/marketplace', { params: { category } }),
  getMy: () => api.get('/marketplace/my'),
  create: (data: any) => api.post('/marketplace', data),
  markSold: (id: string) => api.put(`/marketplace/${id}/sold`),
  delete: (id: string) => api.delete(`/marketplace/${id}`),
};

export const paymentsApi = {
  getProviders: () => api.get<{ WAVE: boolean; ORANGE_MONEY: boolean; simulation: boolean }>('/payments/providers'),
  getSubscription: () => api.get('/payments/subscription'),
  getHistory: () => api.get('/payments/history'),
  initiate: (data: { provider: 'WAVE' | 'ORANGE_MONEY'; amount: number; phoneNumber?: string; successUrl?: string; errorUrl?: string }) =>
    api.post('/payments/initiate', data),
  simulateConfirm: (paymentId: string) =>
    api.post(`/payments/simulate-confirm/${paymentId}`),
};

export default api;
