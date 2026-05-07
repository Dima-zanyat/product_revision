/**
 * Главный App компонент
 */

import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { IncomingListPage } from './pages/IncomingListPage';
import { IngredientInventoryPage } from './pages/IngredientInventoryPage';
import { ManagerCabinetPage } from './pages/ManagerCabinetPage';
import { NomenclaturePage } from './pages/NomenclaturePage';
import { ProductionRegisterPage } from './pages/ProductionRegisterPage';
import { RecipeCardsPage } from './pages/RecipeCardsPage';
import { RevisionCreatePage } from './pages/RevisionCreatePage';
import { RevisionDetailPage } from './pages/RevisionDetailPage';
import { RevisionListPage } from './pages/RevisionListPage';
import { authAPI } from './services/api';
import { useAuthStore } from './store/authStore';
import { globalStyles } from './styles/theme';

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
              path="/ingredient-inventories"
              element={
                <ProtectedRoute>
                  <IngredientInventoryPage />
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
              path="/nomenclature"
              element={
                <ProtectedRoute>
                  <NomenclaturePage />
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
            <Route
              path="/how-it-works"
              element={
                <ProtectedRoute>
                  <HowItWorksPage />
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
