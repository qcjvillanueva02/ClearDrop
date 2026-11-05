import axios from 'axios';

// Normalize API base URL: ensure it trims trailing slashes and handles both /api and root paths
const rawBase = (import.meta.env.VITE_API_URL || 'https://cleardrop-whwa.onrender.com/api').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

console.log('[ClearDrop API] Connecting to:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000 // 15 second timeout for cold starts
});

// Interceptor to attach JWT token from localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cleardrop_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle unauthorized responses
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      if (!error.config.url.includes('/auth/status')) {
        localStorage.removeItem('cleardrop_token');
        localStorage.removeItem('cleardrop_user');
      }
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.code === 'ECONNABORTED' ? 'Connection timed out. The server may be waking up.' : error.message);
    return Promise.reject(new Error(message));
  }
);

// ---------------------------------------------------------------------------
// API METHODS
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },
  status: async () => {
    const res = await api.get('/auth/status');
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('cleardrop_token');
    localStorage.removeItem('cleardrop_user');
  }
};

export const inventoryApi = {
  getDashboard: async () => {
    const res = await api.get('/inventory/dashboard');
    return res.data;
  },
  cartAdd: async (code) => {
    const res = await api.post('/inventory', { action: 'cart_add', code });
    return res.data;
  },
  cartRemove: async (materialId) => {
    const res = await api.post('/inventory', { action: 'cart_remove', materialId });
    return res.data;
  },
  checkout: async (customerName, contact) => {
    const res = await api.post('/inventory', { action: 'checkout', customerName, contact });
    return res.data;
  },
  restock: async (materialId, quantity) => {
    const res = await api.post('/inventory', { action: 'restock', materialId, quantity });
    return res.data;
  },
  updateOrderStatus: async (orderId, status) => {
    const res = await api.post('/inventory', { action: 'order_status', orderId, status });
    return res.data;
  }
};

export const catalogApi = {
  getCatalog: async () => {
    const res = await api.get('/catalog');
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/catalog/users');
    return res.data;
  }
};

export default api;
