import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach bearer token safely
api.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = window.localStorage.getItem('iccf_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore storage errors in test / node environments
  }
  return config;
});

// Response interceptor: auto-logout on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('iccf_token');
          window.localStorage.removeItem('iccf_user');
          if (window.location && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } catch {
        // Ignore
      }
    }
    return Promise.reject(error);
  }
);
