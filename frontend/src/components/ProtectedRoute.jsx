/**
 * Компонент для защиты маршрутов
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoginModal } from './LoginModal';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  font-size: 18px;
  color: ${theme.colors.textLight};
`;

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, checkAuth, loading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    verifyAuth();
  }, [checkAuth]);

  if (isChecking || loading) {
    return <LoadingContainer>Проверка авторизации...</LoadingContainer>;
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginModal isOpen={true} onClose={() => {}} required={true} />
        <div style={{ opacity: 0.3, pointerEvents: 'none' }}>
          {children}
        </div>
      </>
    );
  }

  return children;
};
