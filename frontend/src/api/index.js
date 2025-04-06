import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for cookies/sessions
});

// Log API configuration for debugging
console.log('API baseURL:', api.defaults.baseURL);

// Helper function to check if token has expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Split the token and get the payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if the expiration time is past
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    console.error('Error parsing token:', e);
    return true;
  }
};

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  // Only use token if it exists and hasn't expired
  if (token && !isTokenExpired(token)) {
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
    // Only redirect to login for auth errors that aren't from the auth endpoints themselves
    const isAuthRequest = error.config?.url?.includes('/auth/');
    
    if ((error.response?.status === 401 || error.response?.status === 403) && !isAuthRequest) {
      // Don't redirect if already on login page to prevent redirect loops
      if (!window.location.pathname.includes('login')) {
        // Save current location for redirect after login
        localStorage.setItem('redirectAfterLogin', window.location.pathname);
        toast.error('Session expired. Please login again.');
        
        // Clear auth state on unauthorized/forbidden
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Use soft navigation instead of hard redirect
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Quiz endpoints
const quizzes = {
  getAll: () => api.get('/api/quizzes'),
  getById: (id) => api.get(`/api/quizzes/${id}`),
  create: (data) => api.post('/api/quizzes', data),
  update: (id, data) => api.put(`/api/quizzes/${id}`, data),
  delete: (id) => api.delete(`/api/quizzes/${id}`),
  updateStatus: (id, data) => api.put(`/api/quizzes/${id}/status`, data),
  publish: (id) => {
    console.log(`Publishing quiz with ID ${id} to ${api.defaults.baseURL}/api/quizzes/${id}/publish`);
    return api.put(`/api/quizzes/${id}/publish`);
  },
  pause: (id) => api.put(`/api/quizzes/${id}/status`, { isAcceptingResponses: false }),
  resume: (id) => api.put(`/api/quizzes/${id}/status`, { isAcceptingResponses: true }),
  generateQuestions: (params) => api.post('/api/quizzes/generate', params),
  uploadImage: (formData) => api.post('/api/quizzes/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Auth endpoints
const auth = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (data) => api.post('/api/auth/register', data),
  logout: () => api.post('/api/auth/logout'),
  verify: () => api.get('/api/auth/verify'),
  resetPassword: (email) => api.post('/api/auth/reset-password-request', { email })
};

// Statistics endpoints
const statistics = {
  getQuizStats: (quizId) => api.get(`/api/statistics/quiz/${quizId}`),
  getUserStats: () => api.get('/api/statistics/user')
};

export { api, quizzes, auth, statistics };
