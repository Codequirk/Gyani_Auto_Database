import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests (handle both admin and company auth)
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('auth_token');
  const companyToken = localStorage.getItem('company_auth_token');
  
  // Company portal ALWAYS uses company token since it's a separate app
  let token = companyToken;
  
  // Fallback to admin token if no company token (shouldn't happen in company portal)
  if (!token) {
    token = adminToken;
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn(`[API] No token found for ${config.url}. Path: ${currentPath}, adminToken: ${!!adminToken}, companyToken: ${!!companyToken}`);
  }
  return config;
});

export const authService = {
  registerAdmin: (data) => api.post('/auth/register-admin', data),
  login: (data) => api.post('/auth/login', data),
};

export const companyAuthService = {
  register: (data) => api.post('/company-auth/register', data),
  login: (data) => api.post('/company-auth/login', data),
};

export const adminService = {
  list: () => api.get('/admins'),
  get: (id) => api.get(`/admins/${id}`),
  create: (data) => api.post('/admins', data),
  update: (id, data) => api.patch(`/admins/${id}`, data),
  delete: (id) => api.delete(`/admins/${id}`),
};

export const areaService = {
  list: () => api.get('/areas'),
  get: (id) => api.get(`/areas/${id}`),
  create: (data) => api.post('/areas', data),
};

export const autoService = {
  list: (params) => api.get('/autos', { params }),
  get: (id) => api.get(`/autos/${id}`),
  create: (data) => api.post('/autos', data),
  update: (id, data) => api.patch(`/autos/${id}`, data),
  delete: (id) => api.delete(`/autos/${id}`),
  getAssignments: (id) => api.get(`/autos/${id}/assignments`),
  getAvailableCount: (areaId, startDate, endDate) => api.get('/autos/available/count', { 
    params: { area_id: areaId, start_date: startDate, end_date: endDate } 
  }),
};

export const companyService = {
  list: (params) => api.get('/companies', { params }),
  get: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

export const assignmentService = {
  getActive: () => api.get('/assignments/active'),
  getPriority: () => api.get('/assignments/priority'),
  getByCompany: (companyId) => api.get(`/assignments/company/${companyId}`),
  create: (data) => api.post('/assignments', data),
  bulk: (data) => api.post('/assignments/bulk', data),
  bulkUpdate: (data) => api.patch('/assignments/bulk', data),
  update: (id, data) => api.patch(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  deleteByAutoId: (autoId) => api.delete(`/assignments/auto/${autoId}`),
};

export const companyTicketService = {
  create: (data) => api.post('/company-tickets/', data),
  getByCompany: (companyId) => api.get(`/company-tickets/company/${companyId}`),
  getPending: () => api.get('/company-tickets/admin/pending'),
  approve: (id, data) => api.patch(`/company-tickets/admin/${id}/approve`, data),
  reject: (id, data) => api.patch(`/company-tickets/admin/${id}/reject`, data),
  update: (id, data) => api.patch(`/company-tickets/admin/${id}`, data),
};

export const companyPortalService = {
  getProfile: (companyId) => api.get(`/company-portal/${companyId}/profile`),
  updateProfile: (companyId, data) => api.patch(`/company-portal/${companyId}/profile`, data),
  getAssignments: (companyId) => api.get(`/company-portal/${companyId}/assignments`),
  getDashboard: (companyId) => api.get(`/company-portal/${companyId}/dashboard`),
};

export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary'),
};

export default api;
