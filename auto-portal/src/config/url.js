/**
 * Centralized URL Configuration for Auto Portal
 * Handles environment-based URLs for both development and production
 * 
 * Uses JavaScript URL class for safe origin extraction (no string manipulation)
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Extract origin safely using URL class (no .replace() or string manipulation)
export const API_BASE_URL = API_URL;
export const BACKEND_BASE_URL = new URL(API_URL).origin;

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
  
  return `${BACKEND_BASE_URL}/${cleanUrl}`;
};
