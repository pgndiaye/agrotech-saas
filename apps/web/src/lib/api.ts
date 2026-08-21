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

/**
 * Purge la session des DEUX supports. Le cookie est lu par le middleware Edge
 * (qui n'a pas accès à localStorage) : n'effacer que localStorage laissait une
 * session « fantôme » où le middleware laisse passer et l'API refuse.
 */
function purgerSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('agrotech_token');
  localStorage.removeItem('agrotech_user');
  document.cookie = 'agrotech_token=; path=/; max-age=0; SameSite=Lax';
}

/** Codes renvoyés par l'API quand le compte ou l'organisation est bloqué. */
const CODES_SESSION_INVALIDE = [
  'COMPTE_SUSPENDU',
  'ORGANISATION_SUSPENDUE',
  'COMPTE_SUPPRIME',
  'SESSION_REVOQUEE',
];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const statut = error.response?.status;
      const code = error.response?.data?.code;

      if (statut === 401) {
        purgerSession();
        window.location.href = '/login';
      } else if (statut === 403 && CODES_SESSION_INVALIDE.includes(code)) {
        // Un 403 de suspension n'est pas une erreur métier : la session ne vaut
        // plus rien, il faut sortir l'utilisateur plutôt que d'afficher
        // « impossible de charger » sur chaque écran.
        purgerSession();
        window.location.href = `/login?raison=${encodeURIComponent(code)}`;
      }
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
  // Le montant n'est plus transmis : le serveur le résout depuis planCode.
  // L'API rejette d'ailleurs tout champ inconnu (forbidNonWhitelisted).
  initiate: (data: { provider: 'WAVE' | 'ORANGE_MONEY'; planCode: 'PREMIUM'; phoneNumber?: string; successUrl?: string; errorUrl?: string }) =>
    api.post('/payments/initiate', data),
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

export interface FiltresTenants {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FiltresUsers {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  tenantId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Retire les filtres vides : l'API rejette une valeur d'enum vide. */
const nettoyer = <T extends object>(params: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  ) as Partial<T>;

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getActivity: () => api.get('/admin/activity'),

  getTenants: (filtres: FiltresTenants = {}) =>
    api.get('/admin/tenants', { params: nettoyer(filtres) }),
  getTenant: (id: string) => api.get(`/admin/tenants/${id}`),
  getTenantUsage: (id: string) => api.get(`/admin/tenants/${id}/usage`),
  createTenant: (data: {
    name: string;
    slug: string;
    plan?: string;
    contactEmail?: string;
    contactPhone?: string;
    region?: string;
    notes?: string;
  }) => api.post('/admin/tenants', data),
  updateTenant: (
    id: string,
    data: {
      name?: string;
      plan?: 'FREE' | 'PREMIUM';
      contactEmail?: string;
      contactPhone?: string;
      region?: string;
      notes?: string;
    },
  ) => api.patch(`/admin/tenants/${id}`, data),
  // La suppression exige le slug exact en confirmation.
  deleteTenant: (id: string, confirmSlug: string) =>
    api.delete(`/admin/tenants/${id}`, { data: { confirmSlug } }),
  purgeTenant: (id: string, confirmSlug: string) =>
    api.delete(`/admin/tenants/${id}/purge`, { data: { confirmSlug } }),
  suspendTenant: (id: string, reason: string) =>
    api.patch(`/admin/tenants/${id}/suspend`, { reason }),
  reactivateTenant: (id: string) =>
    api.patch(`/admin/tenants/${id}/reactivate`),
  exportTenantsCsv: (filtres: FiltresTenants = {}) =>
    api.get('/admin/tenants/export/csv', {
      params: nettoyer(filtres),
      responseType: 'blob',
    }),

  getUsers: (filtres: FiltresUsers = {}) =>
    api.get('/admin/users', { params: nettoyer(filtres) }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  createUser: (data: {
    email: string;
    name: string;
    password: string;
    role: string;
    tenantId: string;
    phone?: string;
  }) => api.post('/admin/users', data),
  updateUser: (id: string, data: { role?: string; name?: string; phone?: string }) =>
    api.patch(`/admin/users/${id}`, data),
  moveUser: (id: string, tenantId: string) =>
    api.patch(`/admin/users/${id}/tenant`, { tenantId }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  suspendUser: (id: string, reason: string) =>
    api.patch(`/admin/users/${id}/suspend`, { reason }),
  reactivateUser: (id: string) => api.patch(`/admin/users/${id}/reactivate`),
  exportUsersCsv: (filtres: FiltresUsers = {}) =>
    api.get('/admin/users/export/csv', {
      params: nettoyer(filtres),
      responseType: 'blob',
    }),

  getPayments: (page = 1, limit = 20) =>
    api.get('/admin/payments', { params: { page, limit } }),

  getAuditLogs: (params: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    actorId?: string;
    from?: string;
    to?: string;
  }) => api.get('/admin/audit-logs', { params }),

  getTaskRuns: (page = 1, limit = 20) =>
    api.get('/admin/tasks', { params: { page, limit } }),

  // ─── Facturation ─────────────────────────────────────────────────────────
  getPlans: () => api.get('/admin/plans'),
  createPlan: (data: Record<string, unknown>) => api.post('/admin/plans', data),
  updatePlan: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/plans/${id}`, data),

  getSubscriptions: (params: {
    page?: number;
    limit?: number;
    status?: string;
    expiringInDays?: number;
  } = {}) => api.get('/admin/subscriptions', { params: nettoyer(params) }),
  grantSubscription: (
    tenantId: string,
    data: { plan: string; months: number; reason: string },
  ) => api.post(`/admin/subscriptions/${tenantId}/grant`, data),
  cancelSubscription: (tenantId: string, reason: string) =>
    api.post(`/admin/subscriptions/${tenantId}/cancel`, { reason }),
  runExpiration: () => api.post('/admin/subscriptions/run-expiration'),

  getKpiOverview: () => api.get('/admin/kpi/overview'),
  getKpiRevenue: (months = 12) => api.get('/admin/kpi/revenue', { params: { months } }),
  getKpiSubscriptions: (months = 12) =>
    api.get('/admin/kpi/subscriptions', { params: { months } }),
  getKpiGrowth: (months = 12) => api.get('/admin/kpi/growth', { params: { months } }),
  getKpiPlans: () => api.get('/admin/kpi/plans'),
};

/** Grille tarifaire publique — alimente la page d'abonnement. */
export const plansApi = {
  getPublics: () =>
    api.get<
      {
        code: string;
        label: string;
        description: string;
        priceXof: number;
        quotas: Record<string, number>;
        features: Record<string, boolean>;
      }[]
    >('/plans'),
};

export default api;
