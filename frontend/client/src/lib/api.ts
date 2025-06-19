import axios from 'axios';

// Create axios instance with base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
console.log("ENV Base URL:", import.meta.env.VITE_API_BASE_URL);
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

export default api;