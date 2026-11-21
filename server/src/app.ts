/**
 * The Space Story API Client
 * Seamlessly supports Web, Local Dev, and Electron environments
 */

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Configurable base URL for API calls:
// In Web dev with Vite proxy or in Electron same-origin, default to /api
// When VITE_API_URL is configured (e.g. http://localhost:3001), routes to that server
const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
export const API_BASE_URL = envApiUrl
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/+$/, '')}/api`)
  : '/api';

export async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${cleanEndpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('tss_token') : null;
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // sends httpOnly auth cookie if available
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);

  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html') || contentType.includes('application/pdf')) {
    return await res.text();
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = json.error || {};
    throw new ApiError(
      error.message || `Request failed with status ${res.status}`,
      res.status,
      error.code || 'UNKNOWN_ERROR',
      error.details
    );
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Clients
  getClients: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/clients${query ? `?${query}` : ''}`);
  },
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) => request('/clients', { method: 'POST', body: data }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PATCH', body: data }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/projects${query ? `?${query}` : ''}`);
  },
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: data }),

  // Catalogue
  getCatalogue: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/catalogue${query ? `?${query}` : ''}`);
  },
  createCatalogueItem: (data) => request('/catalogue', { method: 'POST', body: data }),
  updateCatalogueItem: (id, data) => request(`/catalogue/${id}`, { method: 'PATCH', body: data }),
  deleteCatalogueItem: (id) => request(`/catalogue/${id}`, { method: 'DELETE' }),

  // Quotations
  getQuotations: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/quotations${query ? `?${query}` : ''}`);
  },
  getQuotation: (id) => request(`/quotations/${id}`),
  createQuotation: (data) => request('/quotations', { method: 'POST', body: data }),
  updateQuotation: (id, data) => request(`/quotations/${id}`, { method: 'PATCH', body: data }),
  calculateQuotation: (data) => request('/quotations/calculate', { method: 'POST', body: data }),
  issueQuotation: (id) => request(`/quotations/${id}/issue`, { method: 'POST' }),
  createRevision: (id) => request(`/quotations/${id}/revisions`, { method: 'POST' }),
  approveQuotation: (id) => request(`/quotations/${id}/approve`, { method: 'POST' }),
  rejectQuotation: (id) => request(`/quotations/${id}/reject`, { method: 'POST' }),
  cancelQuotation: (id) => request(`/quotations/${id}/cancel`, { method: 'POST' }),
  reopenQuotation: (id) => request(`/quotations/${id}/reopen`, { method: 'POST' }),
  getQuotationPdfUrl: (id, theme = 'tss_brand') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tss_token') : null;
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/quotations/${id}/pdf?theme=${encodeURIComponent(theme)}${tokenParam}`;
  },

  // Settings
  getStudioSettings: () => request('/settings/studio'),
  updateStudioSettings: (data) => request('/settings/studio', { method: 'PATCH', body: data }),
};
