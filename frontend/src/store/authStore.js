/**
 * Zustand store для авторизации
 */

import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Проверить текущего пользователя
  checkAuth: async () => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.getCurrentUser();
      set({ 
        user: response.data, 
        isAuthenticated: true,
        loading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        user: null, 
        isAuthenticated: false,
        loading: false 
      });
      return null;
    }
  },

  // Войти в систему
  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(username, password);
      set({ 
        user: response.data.user, 
        isAuthenticated: true,
        loading: false,
        error: null
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail ||
                          'Ошибка при входе в систему';
      set({ 
        error: errorMessage,
        loading: false,
        isAuthenticated: false,
        user: null
      });
      throw error;
    }
  },

  // Выйти из системы
  logout: async () => {
    set({ loading: true });
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      set({ 
        user: null, 
        isAuthenticated: false,
        loading: false,
        error: null
      });
    }
  },

  // Очистить ошибку
  clearError: () => set({ error: null }),
}));
