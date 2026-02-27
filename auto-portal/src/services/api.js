import axios from 'axios';
import { API_BASE_URL } from '../config/url';

console.log('[AUTO-PORTAL API] Initialized with API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
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
    formData.append('image', file);
    // Don't manually set Content-Type header - axios will set it correctly with FormData
    return api.post('/auto-portal/upload-image', formData);
  },
};

export default api;
