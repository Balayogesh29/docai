import { auth } from '../firebase';
import {
  mockUser,
  dashboardStats,
  documentTypes,
  mockDocuments,
  mockTemplates
} from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Helper for sending authenticated requests to the FastAPI backend
export const fetchWithAuth = async (endpoint, options = {}) => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User is not authenticated. Please sign in.');
  }

  const token = await currentUser.getIdToken(false);
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const timeoutMs = options.timeoutMs || 300000; // Default 5min timeout for multi-stage LLM pipelines

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const { timeoutMs: _, signal: customSignal, ...fetchOptions } = options;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: customSignal || controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP error ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = errorData;
      console.error(`[API Error ${response.status}] Request to ${url} failed:`, errorMessage, errorData);
      throw error;
    }

    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out. The AI service took longer than expected to respond.');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    if (!err.status) {
      console.error(`[Network Connection Error] Failed to fetch from ${url}. Check backend status & CORS.`, err);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Simulated delay helper
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Verify Firebase ID Token with FastAPI backend
  verifyAuthToken: async () => {
    return await fetchWithAuth('/api/auth/me');
  },

  // Authentication placeholders
  login: async (email, password) => {
    await delay(600);
    return {
      user: { ...mockUser, email },
      token: "mock-jwt-token-abcd"
    };
  },

  register: async (fullName, email, password) => {
    await delay(800);
    return {
      user: { ...mockUser, name: fullName, email },
      token: "mock-jwt-token-abcd"
    };
  },

  // User Profile
  getUserProfile: async () => {
    await delay(300);
    return { ...mockUser };
  },

  updateUserProfile: async (userData) => {
    await delay(500);
    return { ...mockUser, ...userData };
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    await delay(300);
    return { ...dashboardStats };
  },

  // Document Types
  getDocumentTypes: async () => {
    await delay(200);
    return [...documentTypes];
  },

  // Templates
  getTemplates: async () => {
    await delay(300);
    return [...mockTemplates];
  }
};
