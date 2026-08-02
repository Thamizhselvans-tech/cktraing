import axios from 'axios';

let rawBaseUrl = (import.meta.env.VITE_API_URL || '/api').trim();
if (rawBaseUrl.startsWith('http') && !rawBaseUrl.endsWith('/api') && !rawBaseUrl.endsWith('/api/')) {
  rawBaseUrl = rawBaseUrl.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL: rawBaseUrl,
  withCredentials: true, // Send HttpOnly cookies with every request
  timeout: 10000, // 10s timeout to prevent hanging
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Authorization token if available in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tms_token');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
