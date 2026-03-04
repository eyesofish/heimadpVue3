import axios from 'axios';

const TOKEN_STORAGE_KEY = 'jwt_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const normalizeToken = (token) => {
  if (!token) {
    return '';
  }
  return token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
};

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

http.interceptors.request.use((config) => {
  const rawToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const token = normalizeToken(rawToken);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (
      payload &&
      typeof payload === 'object' &&
      Object.prototype.hasOwnProperty.call(payload, 'success')
    ) {
      if (payload.success) {
        return payload.data;
      }
      return Promise.reject(new Error(payload.errorMsg || 'Request failed'));
    }
    return payload;
  },
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (window.location.hash !== '#/login') {
        window.location.hash = '/login';
      }
      return Promise.reject(new Error('Unauthorized'));
    }
    const message =
      error?.response?.data?.errorMsg ||
      error?.response?.data?.message ||
      error?.message ||
      'Network error';
    return Promise.reject(new Error(message));
  },
);

export default http;
