/**
 * Главный App компонент
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import { globalStyles, theme } from './styles/theme';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RevisionListPage } from './pages/RevisionListPage';
import { RevisionDetailPage } from './pages/RevisionDetailPage';
import { RevisionCreatePage } from './pages/RevisionCreatePage';
import { IncomingListPage } from './pages/IncomingListPage';
import { RecipeCardsPage } from './pages/RecipeCardsPage';
import { ManagerCabinetPage } from './pages/ManagerCabinetPage';
import { ProductionRegisterPage } from './pages/ProductionRegisterPage';
import { useAuthStore } from './store/authStore';
import { authAPI } from './services/api';

const GlobalStyle = createGlobalStyle`
  ${globalStyles}
`;

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Получаем CSRF токен при загрузке приложения
    const initApp = async () => {
      try {
        await authAPI.getCsrfToken();
      } catch (error) {
        console.error('Ошибка получения CSRF токена:', error);
      }
      // Проверяем авторизацию
      checkAuth();
    };
    initApp();
  }, [checkAuth]);

  return (
    <>
      <GlobalStyle />
      <Router>
        <Layout>
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <RevisionListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/revisions/:id" 
              element={
                <ProtectedRoute>
                  <RevisionDetailPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/revisions/new" 
              element={
                <ProtectedRoute>
                  <RevisionCreatePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/register/:token" 
              element={<ProductionRegisterPage />} 
            />
            <Route 
              path="/incoming" 
              element={
                <ProtectedRoute>
                  <IncomingListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recipe-cards" 
              element={
                <ProtectedRoute>
                  <RecipeCardsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cabinet" 
              element={
                <ProtectedRoute>
                  <ManagerCabinetPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </Router>
    </>
  );
}

export default App;
