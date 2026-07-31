import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Send HttpOnly cookies with every request
  timeout: 10000, // 10s timeout
  headers: { 'Content-Type': 'application/json' },
});

const getCache = new Map();
const CACHE_TTL_MS = 30000; // 30-second RAM cache for GET responses

export const clearApiCache = () => getCache.clear();

// Request interceptor: attach Authorization token and clear cache on mutations
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Clear cache on write operations (POST, PUT, DELETE, PATCH)
    if (config.method && config.method.toLowerCase() !== 'get') {
      getCache.clear();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Custom GET wrapper for Stale-While-Revalidate (0ms instant response)
const originalGet = api.get;
api.get = function (url, config = {}) {
  const cacheKey = url + JSON.stringify(config.params || {});
  const cached = getCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    // Revalidate in background without blocking UI
    originalGet.call(api, url, config)
      .then((res) => getCache.set(cacheKey, { timestamp: Date.now(), data: res }))
      .catch(() => {});
    return Promise.resolve(cached.data);
  }

  return originalGet.call(api, url, config).then((res) => {
    getCache.set(cacheKey, { timestamp: Date.now(), data: res });
    return res;
  });
};

// Response interceptor: handle 401 unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tms_token');
      getCache.clear();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
