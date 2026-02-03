/**
 * Модальное окно для авторизации
 */

import { useState } from 'react';
import styled from 'styled-components';
import { useAuthStore } from '../store/authStore';
import { theme } from '../styles/theme';
import { Modal } from './Modal';
import { Input, Label, FormGroup } from './Input';
import { Button } from './Button';

const LoginForm = styled.form`
  width: 100%;
`;

const ErrorMessage = styled.div`
  background-color: ${theme.colors.danger}22;
  color: ${theme.colors.danger};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.md};
  font-size: 14px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.lg};
  z-index: 10;
`;

export const LoginModal = ({ isOpen, onClose, required = false }) => {
  const { login, loading, error, isAuthenticated } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!username || !password) {
      setLocalError('Пожалуйста, заполните все поля');
      return;
    }

    try {
      await login(username, password);
      setUsername('');
      setPassword('');
      if (!required) {
        onClose();
      }
    } catch (err) {
      // Ошибка уже обработана в store
      setLocalError(err.response?.data?.error || 'Ошибка при входе в систему');
    }
  };

  // Если авторизован и модалка обязательна, закрываем её
  if (isAuthenticated && required) {
    onClose();
  }

  const displayError = error || localError;

  return (
    <Modal
      isOpen={isOpen}
      onClose={required ? () => {} : onClose}
      title="Вход в систему"
      footer={
        <Button
          type="submit"
          form="login-form"
          variant="primary"
          disabled={loading}
        >
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      }
    >
      <LoginForm id="login-form" onSubmit={handleSubmit}>
        {displayError && (
          <ErrorMessage>{displayError}</ErrorMessage>
        )}
        
        <FormGroup>
          <Label>Имя пользователя</Label>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Введите имя пользователя"
            disabled={loading}
            autoFocus
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Пароль</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            disabled={loading}
            required
          />
        </FormGroup>
      </LoginForm>
    </Modal>
  );
};
