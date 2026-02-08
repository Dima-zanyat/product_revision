/**
 * API сервис для взаимодействия с backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Важно для работы с сессиями
});

// Получить CSRF токен из cookies или из ответа сервера
const getCsrfToken = () => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Добавить CSRF токен в заголовки для POST/PUT/DELETE запросов
api.interceptors.request.use(
  config => {
    const csrfToken = getCsrfToken();
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Обработка ошибок авторизации
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Если ошибка авторизации, очищаем состояние
      const authStore = require('../store/authStore').useAuthStore.getState();
      if (authStore.isAuthenticated) {
        authStore.logout();
      }
    }
    return Promise.reject(error);
  }
);

// Revisions API
export const revisionsAPI = {
  getAll: (params) => api.get('/revisions/', { params }),
  getById: (id) => api.get(`/revisions/${id}/`),
  create: (data) => api.post('/revisions/', data),
  update: (id, data) => api.put(`/revisions/${id}/`, data),
  delete: (id) => api.delete(`/revisions/${id}/`),
  calculate: (id) => api.post(`/revisions/${id}/calculate/`),
  summary: (id) => api.get(`/revisions/${id}/summary/`),
  submit: (id) => api.post(`/revisions/${id}/submit/`),
  approve: (id) => api.post(`/revisions/${id}/approve/`),
  reject: (id, data) => api.post(`/revisions/${id}/reject/`, data),
};

// Reports API
export const reportsAPI = {
  getAll: (params) => api.get('/revision-reports/', { params }),
  getById: (id) => api.get(`/revision-reports/${id}/`),
};

// Revision Items API
export const revisionItemsAPI = {
  getProductItems: (params) => api.get('/revision-product-items/', { params }),
  getIngredientItems: (params) => api.get('/revision-ingredient-items/', { params }),
  createProductItem: (data) => api.post('/revision-product-items/', data),
  updateProductItem: (id, data) => api.put(`/revision-product-items/${id}/`, data),
  deleteProductItem: (id) => api.delete(`/revision-product-items/${id}/`),
  createIngredientItem: (data) => api.post('/revision-ingredient-items/', data),
  updateIngredientItem: (id, data) => api.put(`/revision-ingredient-items/${id}/`, data),
  deleteIngredientItem: (id) => api.delete(`/revision-ingredient-items/${id}/`),
  uploadExcel: (formData) => api.post('/revision-product-items/upload-excel/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Reference Data API (справочники)
export const referenceAPI = {
  getLocations: (params) => api.get('/locations/', { params }).catch(() => ({ data: [] })),
  getProducts: (params) => api.get('/products/', { params }).catch(() => ({ data: [] })),
  getIngredients: (params) => api.get('/ingredients/', { params }).catch(() => ({ data: [] })),
};

// Products API
export const productsAPI = {
  getById: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  delete: (id) => api.delete(`/products/${id}/`),
};

// Ingredients API
export const ingredientsAPI = {
  create: (data) => api.post('/ingredients/', data),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users/', { params }),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
};

// Productions API
export const productionsAPI = {
  getById: (id) => api.get(`/productions/${id}/`),
  update: (id, data) => api.put(`/productions/${id}/`, data),
};

// Recipe items API (технологические карты)
export const recipeItemsAPI = {
  getAll: (params) => api.get('/recipe-items/', { params }),
  create: (data) => api.post('/recipe-items/', data),
  update: (id, data) => api.put(`/recipe-items/${id}/`, data),
  delete: (id) => api.delete(`/recipe-items/${id}/`),
};

// Incoming (поступления) API
export const incomingAPI = {
  getAll: (params) => api.get('/incoming/', { params }),
  getById: (id) => api.get(`/incoming/${id}/`),
  create: (data) => api.post('/incoming/', data),
  update: (id, data) => api.put(`/incoming/${id}/`, data),
  delete: (id) => api.delete(`/incoming/${id}/`),
};

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login/', { username, password }),
  logout: () => api.post('/auth/logout/'),
  getCurrentUser: () => api.get('/auth/me/'),
  getCsrfToken: () => api.get('/auth/csrf/'),
  register: (data) => api.post('/auth/register/', data),
};

export default api;
