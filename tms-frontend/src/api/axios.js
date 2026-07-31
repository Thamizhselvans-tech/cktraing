import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Send HttpOnly cookies with every request
  timeout: 15000, // 15s timeout to prevent hanging forever on cold starts
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

// Response interceptor: redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tms_token');
      // Clear any cached auth state
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
