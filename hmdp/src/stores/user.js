import { reactive } from 'vue';
import { clearStoredToken, getStoredToken, setStoredToken } from '../api/auth';
import { getCurrentUser, logoutUser } from '../api';

const USER_STORAGE_KEY = 'dev_user_snapshot';
const MOCK_STORAGE_KEY = 'mock_user_enabled';

const readUserSnapshot = () => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const authState = reactive({
  token: '',
  user: null,
  initialized: false,
});

export const initUserState = () => {
  authState.token = getStoredToken();
  authState.user = readUserSnapshot();
  authState.initialized = true;
};

export const setAuthToken = (token) => {
  authState.token = setStoredToken(token);
};

export const setAuthUser = (user) => {
  authState.user = user || null;
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const clearAuth = () => {
  authState.token = '';
  clearStoredToken();
  setAuthUser(null);
  localStorage.removeItem(MOCK_STORAGE_KEY);
};

export const refreshUser = async () => {
  if (!authState.token) {
    setAuthUser(readUserSnapshot());
    return authState.user;
  }
  try {
    const me = await getCurrentUser();
    setAuthUser(me);
    localStorage.removeItem(MOCK_STORAGE_KEY);
    return me;
  } catch (error) {
    if (localStorage.getItem(MOCK_STORAGE_KEY) === '1' && authState.user) {
      return authState.user;
    }
    clearAuth();
    throw error;
  }
};

export const enableMockUser = (mockToken = 'dev-mock-token') => {
  const mockUser = {
    id: -1,
    nickName: 'Mock Dev User',
    icon: '',
  };
  setAuthToken(mockToken);
  setAuthUser(mockUser);
  localStorage.setItem(MOCK_STORAGE_KEY, '1');
  return mockUser;
};

export const signOut = async () => {
  try {
    await logoutUser();
  } catch {
    // ignore backend logout failure; local state is still cleared
  }
  clearAuth();
};
