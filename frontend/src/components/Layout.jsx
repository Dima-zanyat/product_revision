/**
 * Основной Layout компонент
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuthStore } from '../store/authStore';
import { theme } from '../styles/theme';
import { AssistantWidget } from './AssistantWidget';
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
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.xl};
  flex-wrap: wrap;

  @media (max-width: 1200px) {
    align-items: flex-start;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  min-width: 220px;
  flex-shrink: 0;
  width: 100%;

  @media (min-width: 900px) {
    width: auto;
  }
`;

const Logo = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.lg};
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;

  @media (max-width: 1200px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const NavGroup = styled(ButtonGroup)`
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  width: 100%;

  @media (min-width: 900px) {
    width: auto;
  }
`;

const UserActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;

  @media (max-width: 1200px) {
    margin-left: auto;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: 14px;
  white-space: nowrap;
`;

const HeaderContainer = styled.div`
  max-width: 1480px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const MainContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const Main = styled.main`
  margin-top: ${theme.spacing.xl};
`;

const HeaderButton = styled(Button)`
  white-space: nowrap;
`;

const SecondaryHeaderButton = styled(Button)`
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

const LogoutButton = styled(Button)`
  white-space: nowrap;
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
  const isIngredientInventories = location.pathname.startsWith('/ingredient-inventories');
  const isNomenclature = location.pathname.startsWith('/nomenclature');
  const isRecipeCards = location.pathname.startsWith('/recipe-cards');
  const isCabinet = location.pathname.startsWith('/cabinet');
  const isRevisions = location.pathname === '/' || location.pathname.startsWith('/revisions');
  const isHowItWorks = location.pathname.startsWith('/how-it-works');

  return (
    <>
      <Header>
        <HeaderContainer>
          <HeaderContent>
            <HeaderLeft>
              <Logo>Product Revision</Logo>
              <p>Система контроля остатков ингредиентов</p>
            </HeaderLeft>
            <HeaderRight>
              <NavGroup>
                <HeaderButton
                  variant={isRevisions ? 'primary' : 'default'}
                  onClick={() => navigate('/')}
                >
                  Ревизии
                </HeaderButton>
                <HeaderButton
                  variant={isIncoming ? 'primary' : 'default'}
                  onClick={() => navigate('/incoming')}
                >
                  Поступления
                </HeaderButton>
                {user?.role === 'manager' && (
                  <HeaderButton
                    variant={isIngredientInventories ? 'primary' : 'default'}
                    onClick={() => navigate('/ingredient-inventories')}
                  >
                    Текущие остатки
                  </HeaderButton>
                )}
                <HeaderButton
                  variant={isNomenclature ? 'primary' : 'default'}
                  onClick={() => navigate('/nomenclature')}
                >
                  Номенклатура
                </HeaderButton>
                <HeaderButton
                  variant={isRecipeCards ? 'primary' : 'default'}
                  onClick={() => navigate('/recipe-cards')}
                >
                  Технологические карты
                </HeaderButton>
                <HeaderButton
                  variant={isHowItWorks ? 'primary' : 'default'}
                  onClick={() => navigate('/how-it-works')}
                >
                  Как это работает
                </HeaderButton>
              </NavGroup>
              {isAuthenticated && user ? (
                <UserActions>
                  {user?.role === 'manager' && (
                    <SecondaryHeaderButton
                      variant={isCabinet ? 'primary' : 'default'}
                      onClick={() => navigate('/cabinet')}
                    >
                      Кабинет
                    </SecondaryHeaderButton>
                  )}
                  <UserInfo>
                    <span>{user.username}</span>
                  </UserInfo>
                  <LogoutButton onClick={handleLogout}>
                    Выйти
                  </LogoutButton>
                </UserActions>
              ) : (
                <HeaderButton onClick={() => setShowLoginModal(true)}>
                  Войти
                </HeaderButton>
              )}
            </HeaderRight>
          </HeaderContent>
        </HeaderContainer>
      </Header>
      <Main>
        <MainContainer>{children}</MainContainer>
      </Main>
      <AssistantWidget />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
};
