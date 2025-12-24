import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  registerAdmin: (data) => api.post('/auth/register-admin', data),
  login: (data) => api.post('/auth/login', data),
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

export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary'),
};

export default api;
