import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('[AUTO-PORTAL API] Initialized with API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
});

// Add auto auth token to requests
api.interceptors.request.use((config) => {
  const autoAuthToken = localStorage.getItem('auto_auth_token');
  
  if (autoAuthToken) {
    config.headers.Authorization = `Bearer ${autoAuthToken}`;
  }
  
  console.log(`[AUTO-PORTAL API] ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

// Log response and errors
api.interceptors.response.use(
  (response) => {
    console.log(`[AUTO-PORTAL API] Response from ${response.config.url}:`, response.status);
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
    console.error(`[AUTO-PORTAL API] Error from ${error.config?.url}:`, errorDetails);
    return Promise.reject(error);
  }
);

export const autoAuthService = {
  login: (data) => api.post('/auto-auth/login', data),
};

export const autoPortalService = {
  getAuto: (autoId) => api.get(`/auto-portal/${autoId}`),
  uploadImage: (autoId, file) => {
    const formData = new FormData();
    formData.append('auto_id', autoId);
    formData.append('image', file);
    return api.post('/auto-portal/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export default api;
