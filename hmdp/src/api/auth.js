import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'token';
const LEGACY_TOKEN_STORAGE_KEY = 'jwt_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

export const normalizeToken = (token) => {
  if (!token) {
    return '';
  }
  const value = String(token).trim();
  return value.startsWith('Bearer ') ? value.slice(7).trim() : value;
};

const extractToken = (payload) => {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload.token === 'string') {
    return payload.token;
  }
  if (typeof payload.data === 'string') {
    return payload.data;
  }
  if (payload.data && typeof payload.data.token === 'string') {
    return payload.data.token;
  }
  return '';
};

export const getStoredToken = () => {
  const current = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (current) {
    return normalizeToken(current);
  }
  const legacy = localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
  return normalizeToken(legacy);
};

export const setStoredToken = (token) => {
  const normalized = normalizeToken(token);
  if (normalized) {
    localStorage.setItem(TOKEN_STORAGE_KEY, normalized);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    return normalized;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  return '';
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
};

export const devLogin = async () => {
  const response = await authClient.post('/dev/login');
  const token = normalizeToken(extractToken(response?.data));
  if (!token) {
    throw new Error('Dev login succeeded but response token is missing');
  }
  return token;
};

export const ensureDevAuthToken = async () => {
  const cached = getStoredToken();
  if (cached) {
    setStoredToken(cached);
    return cached;
  }
  const freshToken = await devLogin();
  return setStoredToken(freshToken);
};
