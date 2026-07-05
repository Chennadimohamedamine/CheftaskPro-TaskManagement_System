 

import axios, { AxiosError } from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';

// In-memory token storage to avoid cookie vulnerabilities or excessive localStorage access
let accessToken: string | null = localStorage.getItem('tf_at');

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('tf_at', token);
  } else {
    localStorage.removeItem('tf_at');
  }
}

export const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Crucial for receiving/sending HTTP-only refresh token cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Flag to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: Attach access token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Refresh token on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (!error.response) {
      return Promise.reject(error);
    }

    // Check if unauthorized and not retried yet
    if (error.response.status === 401 && !originalRequest._retry) {
      // Avoid infinite loop if refresh endpoint itself fails with 401
      if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
        setAccessToken(null);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const newAccessToken = refreshResponse.data.data.accessToken;

        setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        setAccessToken(null);
        
        // Dispatch custom event to notify AuthContext to log out user
        window.dispatchEvent(new Event('auth_session_expired'));
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
