/**
 * Zustand store для ревизий
 */

import { create } from 'zustand';
import { revisionsAPI, reportsAPI } from '../services/api';

export const useRevisionStore = create((set, get) => ({
  revisions: [],
  currentRevision: null,
  reports: [],
  loading: false,
  error: null,

  // Получить все ревизии
  fetchRevisions: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await revisionsAPI.getAll(params);
      set({ revisions: response.data.results || response.data });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  // Получить ревизию по ID
  fetchRevision: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await revisionsAPI.getById(id);
      set({ currentRevision: response.data });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  // Создать ревизию
  createRevision: async (data) => {
    set({ loading: true, error: null });
    try {
      console.log('Создание ревизии с данными:', data);
      const response = await revisionsAPI.create(data);
      console.log('Ревизия создана:', response.data);
      set(state => ({
        revisions: [response.data, ...state.revisions],
        currentRevision: response.data,
      }));
      return response.data;
    } catch (error) {
      console.error('Ошибка создания ревизии в store:', error);
      console.error('Response:', error.response);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.non_field_errors?.[0] ||
                          error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Расчитать ревизию
  calculateRevision: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await revisionsAPI.calculate(id);
      await get().fetchRevision(id);
      await get().fetchReports({ revision: id });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Получить отчеты
  fetchReports: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await reportsAPI.getAll(params);
      set({ reports: response.data.results || response.data });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  // Отправить ревизию на обработку
  submitRevision: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await revisionsAPI.submit(id);
      await get().fetchRevision(id);
      await get().fetchRevisions();
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Подтвердить ревизию
  approveRevision: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await revisionsAPI.approve(id);
      await get().fetchRevision(id);
      await get().fetchRevisions();
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Отклонить ревизию
  rejectRevision: async (id, reason) => {
    set({ loading: true, error: null });
    try {
      const response = await revisionsAPI.reject(id, { reason });
      await get().fetchRevision(id);
      await get().fetchRevisions();
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Очистить ошибку
  clearError: () => set({ error: null }),
}));