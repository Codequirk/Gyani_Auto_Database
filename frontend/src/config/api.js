/**
 * Centralized API Configuration
 * Handles environment-based URLs for both development and production
 *
 * Development: Uses VITE_API_URL (defaults to http://localhost:5001/api)
 * Production: Uses VITE_API_URL from .env.production (https://api.connectadsadmin.tech/api)
 */

/**
 * API_URL: Full URL including /api path
 * Examples:
 *   Dev: http://localhost:5001/api
 *   Prod: https://api.connectadsadmin.tech/api
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * BASE_URL: Backend base URL without /api (for image serving and static files)
 * Automatically derived from API_URL by removing /api
 * Examples:
 *   Dev: http://localhost:5001
 *   Prod: https://api.connectadsadmin.tech
 */
export const BASE_URL = (() => {
  const url = API_URL.replace('/api', '');
  // Remove trailing slash if present
  return url.endsWith('/') ? url.slice(0, -1) : url;
})();

/**
 * Convert relative image URLs to full URLs
 * Examples:
 *   Input: /uploads/auto-images/filename.jpg
 *   Output (dev): http://localhost:5001/uploads/auto-images/filename.jpg
 *   Output (prod): https://api.connectadsadmin.tech/uploads/auto-images/filename.jpg
 */
export const getFullImageUrl = (relativeUrl) => {
  if (!relativeUrl) return null;
  
  // If already a full URL, return as-is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  
  // Remove leading slash to avoid double slashes
  const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
  
  return `${BASE_URL}/${cleanUrl}`;
};

// Debug logging in development mode
if (import.meta.env.DEV) {
  console.log('[API Config]', {
    API_URL,
    BASE_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    MODE: import.meta.env.MODE,
  });
}

export default {
  API_URL,
  BASE_URL,
  getFullImageUrl,
};
