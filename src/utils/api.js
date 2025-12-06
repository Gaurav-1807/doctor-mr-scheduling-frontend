import axios from 'axios';

// Use environment variable or fallback to proxy (for development)
const baseURL = process.env.REACT_APP_API_URL || '/api';

// Base URL for static files (uploads) - without /api suffix
export const getUploadUrl = (path) => {
  if (!path) return null;
  // If path is already a full URL, return as is
  if (path.startsWith('http')) return path;
  // Get base URL without /api suffix
  const staticBaseUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
  return `${staticBaseUrl}${path}`;
};

const API = axios.create({
  baseURL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
