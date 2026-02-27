/**
 * Centralized URL Configuration
 * Uses JavaScript URL class for safe, reliable URL parsing
 * 
 * Safely reads VITE_API_URL environment variable and derives URLs
 * without string manipulation or regex.
 */

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('[URL Config] VITE_API_URL environment variable is not set');
}

/**
 * API_BASE_URL: Full URL including /api path
 * Examples:
 *   Dev: http://localhost:5001/api
 *   Prod: https://api.connectadsadmin.tech/api
 */
export const API_BASE_URL = API_URL || 'http://localhost:5001/api';

/**
 * BACKEND_BASE_URL: Backend origin without /api (for image serving and static files)
 * Safely extracted using JavaScript URL class
 * Examples:
 *   Dev: http://localhost:5001
 *   Prod: https://api.connectadsadmin.tech
 */
export const BACKEND_BASE_URL = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch (error) {
    console.error('[URL Config] Invalid API_BASE_URL:', API_BASE_URL, error);
    return 'http://localhost:5001';
  }
})();

/**
 * Construct full image URL from relative path
 * Examples:
 *   Input: /uploads/auto-images/filename.jpg
 *   Output (dev): http://localhost:5001/uploads/auto-images/filename.jpg
 *   Output (prod): https://api.connectadsadmin.tech/uploads/auto-images/filename.jpg
 */
export const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Construct: BACKEND_BASE_URL + imagePath
  // imagePath is expected to start with /
  return `${BACKEND_BASE_URL}${imagePath}`;
};

// Debug logging in development
if (import.meta.env.DEV) {
  console.log('[URL Config]', {
    API_BASE_URL,
    BACKEND_BASE_URL,
    env: import.meta.env.MODE,
  });
}
