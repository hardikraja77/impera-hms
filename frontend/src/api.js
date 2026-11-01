import axios from 'axios';

// The relative '/api' base is correct for development: Vite proxies /api to
// Laravel (see frontend/vite.config.js), so requests are same-origin and the
// browser shows localhost:5173/api/login — that is EXPECTED, not a bug.
// Only when the frontend is served from a different origin than the backend
// (no Vite proxy in production), set VITE_API_URL in frontend/.env to the full
// backend base URL, e.g. VITE_API_URL=http://localhost:8000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Unauthorized — token expired or invalid
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiresAt');
        window.location.href = '/';
        return Promise.reject(error);
      }

      // Forbidden — role mismatch
      if (status === 403) {
        console.warn('[API] Access denied:', data?.message);
      }

      // Not found — missing endpoint or resource
      if (status === 404) {
        console.error('[API] Resource not found:', error.config?.url, data?.message);
      }

      // Server errors
      if (status >= 500) {
        console.error('[API] Server error:', error.config?.url, data?.message);
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('[API] Request timeout:', error.config?.url);
    } else {
      console.error('[API] Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Get a user-friendly error message from an API error
 */
export function getErrorMessage(error) {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const val = errors[firstKey];
      return Array.isArray(val) ? val[0] : val;
    }
  }
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (!error.response) return 'Network error. Please check your connection.';
  return 'Something went wrong. Please try again.';
}

/**
 * Generate a WhatsApp deep link (works on mobile and desktop)
 */
export function generateWhatsAppLink(phone, message) {
  const cleaned = phone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

export default api;
