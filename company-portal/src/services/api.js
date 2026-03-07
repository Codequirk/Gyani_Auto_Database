import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('[API] Initialized with API_URL:', API_URL);
console.log('[API] Environment variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
});

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests (handle both admin and company auth)
api.interceptors.request.use((config) => {
  // Don't override if Authorization header is already explicitly set
  if (config.headers.Authorization !== undefined) {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url} (using custom auth header or explicitly unauthenticated)`);
    return config;
  }

  // List of routes that don't require authentication
  const unauthenticatedRoutes = [
    '/company-auth/register-email',
    '/company-auth/verify-otp',
    '/company-auth/complete-profile',
    '/company-auth/login',
    '/company-auth/google-login',
    '/company-auth/request-password-reset',
    '/company-auth/reset-password',
  ];

  const isUnauthenticatedRoute = unauthenticatedRoutes.some(route => config.url.includes(route));

  if (isUnauthenticatedRoute) {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url} (unauthenticated route)`);
    return config;
  }

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
    console.warn(`[API] No token found for ${config.url}. adminToken: ${!!adminToken}, companyToken: ${!!companyToken}`);
  }
  console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

// Add response error interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    };
    console.error(`[API] Error from ${error.config?.url}:`, errorDetails);
    console.error(`[API] Error details (JSON):`, JSON.stringify(errorDetails, null, 2));
    return Promise.reject(error);
  }
);

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

export const autoImageService = {
  getImageSections: () => api.get('/auto-images/image-sections'),
  uploadImage: (autoId, file) => {
    const formData = new FormData();
    formData.append('auto_id', autoId);
    formData.append('image', file);
    return api.post('/auto-images/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteImage: (autoId) => api.delete(`/auto-images/delete-image/${autoId}`),
};

// Company Authentication Service - New OTP-based auth flow
export const companyAuthService = {
  // Step 1: Request OTP via email
  registerEmail: (data) => {
    console.log('[companyAuthService.registerEmail] Calling:', data);
    return api.post('/company-auth/register-email', data, {
      headers: { Authorization: '' } // No auth required for registration
    });
  },

  // Step 2: Verify OTP and create user account
  verifyOTP: (data) => {
    console.log('[companyAuthService.verifyOTP] Calling:', data);
    return api.post('/company-auth/verify-otp', data, {
      headers: { Authorization: '' } // No auth required for OTP verification
    });
  },

  // Step 3: Complete profile with password and company details
  completeProfile: (data) => {
    console.log('[companyAuthService.completeProfile] Calling:', data);
    return api.post('/company-auth/complete-profile', data, {
      headers: { Authorization: '' } // No auth required during registration
    });
  },

  // Login with email and password (for existing users)
  login: (data) => {
    console.log('[companyAuthService.login] Calling:', data);
    return api.post('/company-auth/login', data, {
      headers: { Authorization: '' } // No auth required for login
    });
  },

  // Google OAuth login
  googleLogin: (data) => {
    console.log('[companyAuthService.googleLogin] Calling');
    return api.post('/company-auth/google-login', data, {
      headers: { Authorization: '' } // No auth required for Google login
    });
  },

  // Request password reset link
  requestPasswordReset: (data) => {
    console.log('[companyAuthService.requestPasswordReset] Calling:', data);
    return api.post('/company-auth/request-password-reset', data, {
      headers: { Authorization: '' } // No auth required for password reset request
    });
  },

  // Reset password with token
  resetPassword: (data) => {
    console.log('[companyAuthService.resetPassword] Calling');
    return api.post('/company-auth/reset-password', data, {
      headers: { Authorization: '' } // No auth required for password reset
    });
  },

  // Get current user profile (requires auth token)
  getProfile: () => {
    console.log('[companyAuthService.getProfile] Calling');
    return api.get('/company-auth/profile');
  },

  // Logout (requires auth token)
  logout: () => {
    console.log('[companyAuthService.logout] Calling');
    return api.post('/company-auth/logout', {});
  },
};

// Payment Service
export const paymentService = {
  getAllPayments: () => api.get('/payments/all'),
  getCompanyPayments: (companyId) => api.get(`/payments/company/${companyId}`),
  getTicketPayments: (ticketId) => api.get(`/payments/ticket/${ticketId}`),
  getPaymentsByStatus: (status) => api.get(`/payments/status/${status}`),
};

export default api;
