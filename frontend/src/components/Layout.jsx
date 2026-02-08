/**
 * Основной Layout компонент
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { useAuthStore } from '../store/authStore';
import { Button, ButtonGroup } from './Button';
import { LoginModal } from './LoginModal';

const Header = styled.header`
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  color: white;
  padding: ${theme.spacing.lg};
  box-shadow: ${theme.shadows.md};
  border-radius: 0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg};
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const Logo = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const NavGroup = styled(ButtonGroup)`
  gap: ${theme.spacing.sm};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: 14px;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const Main = styled.main`
  margin-top: ${theme.spacing.xl};
`;

const LogoutButton = styled(Button)`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const Layout = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const isIncoming = location.pathname.startsWith('/incoming');
  const isRecipeCards = location.pathname.startsWith('/recipe-cards');
  const isRevisions = location.pathname === '/' || location.pathname.startsWith('/revisions');

  return (
    <>
      <Header>
        <Container>
          <HeaderContent>
            <HeaderLeft>
              <Logo>📊 Product Revision</Logo>
              <p>Система контроля остатков ингредиентов</p>
            </HeaderLeft>
            <HeaderRight>
              <NavGroup>
                <Button
                  variant={isRevisions ? 'primary' : 'default'}
                  onClick={() => navigate('/')}
                >
                  Ревизии
                </Button>
                <Button
                  variant={isIncoming ? 'primary' : 'default'}
                  onClick={() => navigate('/incoming')}
                >
                  Поступления
                </Button>
                <Button
                  variant={isRecipeCards ? 'primary' : 'default'}
                  onClick={() => navigate('/recipe-cards')}
                >
                  Технологические карты
                </Button>
              </NavGroup>
              {isAuthenticated && user ? (
                <>
                  <UserInfo>
                    <span>👤 {user.username}</span>
                  </UserInfo>
                  <LogoutButton onClick={handleLogout}>
                    Выйти
                  </LogoutButton>
                </>
              ) : (
                <Button onClick={() => setShowLoginModal(true)}>
                  Войти
                </Button>
              )}
            </HeaderRight>
          </HeaderContent>
        </Container>
      </Header>
      <Main>
        <Container>{children}</Container>
      </Main>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
};

