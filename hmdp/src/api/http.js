import axios from 'axios';
import { clearStoredToken, devLogin, getStoredToken, setStoredToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

let refreshPromise = null;

const refreshDevToken = async () => {
  if (!refreshPromise) {
    refreshPromise = devLogin()
      .then((token) => {
        const savedToken = setStoredToken(token);
        if (!savedToken) {
          throw new Error('Dev login returned empty token');
        }
        return savedToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

http.interceptors.request.use((config) => {
  const token = getStoredToken();
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
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    if (status === 401 && originalRequest && !originalRequest.__devAuthRetried) {
      originalRequest.__devAuthRetried = true;
      try {
        const token = await refreshDevToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return http(originalRequest);
      } catch (refreshError) {
        clearStoredToken();
        if (refreshError instanceof Error) {
          return Promise.reject(refreshError);
        }
        return Promise.reject(new Error('Unauthorized'));
      }
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
