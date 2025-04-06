import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for cookies/sessions
});

// Log API configuration for debugging
console.log('API baseURL:', api.defaults.baseURL);

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear auth state on unauthorized/forbidden
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    }
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Quiz endpoints
const quizzes = {
  getAll: () => api.get('/quizzes'),
  getById: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  updateStatus: (id, data) => api.put(`/quizzes/${id}/status`, data),
  publish: (id) => api.put(`/quizzes/${id}/publish`),
  pause: (id) => api.put(`/quizzes/${id}/pause`),
  resume: (id) => api.put(`/quizzes/${id}/resume`),
  generateQuestions: (params) => api.post('/quizzes/generate', params),
  uploadImage: (formData) => api.post('/quizzes/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Auth endpoints
const auth = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
  resetPassword: (email) => api.post('/auth/reset-password-request', { email })
};

// Statistics endpoints
const statistics = {
  getQuizStats: (quizId) => api.get(`/statistics/quiz/${quizId}`),
  getUserStats: () => api.get('/statistics/user')
};

export { api, quizzes, auth, statistics };
