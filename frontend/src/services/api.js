import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json'
  },
  withCredentials: true, // IMPORTANT: Untuk cookie berbasis SPA Sanctum
});

api.interceptors.request.use(config => {
  if (typeof document !== 'undefined') {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (token) {
      config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token[1]);
    }
  }
  return config;
});

export default api;
