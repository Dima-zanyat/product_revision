/**
 * Input компонент
 */

import { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

export const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.gray};
  background-color: ${theme.colors.lightGray};
  border-radius: ${theme.borderRadius.md};
  font-size: 14px;
  transition: all 0.3s ease;

  &::placeholder {
    color: ${theme.colors.textLight};
  }

  &:hover {
    border-color: ${theme.colors.primary};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primary}22;
  }
  
  &:disabled {
    background-color: ${theme.colors.lightGray};
    cursor: not-allowed;
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.gray};
  background-color: ${theme.colors.lightGray};
  border-radius: ${theme.borderRadius.md};
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  transition: all 0.3s ease;
  font-family: inherit;

  &::placeholder {
    color: ${theme.colors.textLight};
  }

  &:hover {
    border-color: ${theme.colors.primary};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primary}22;
  }
  
  &:disabled {
    background-color: ${theme.colors.lightGray};
    cursor: not-allowed;
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.gray};
  border-radius: ${theme.borderRadius.md};
  font-size: 14px;
  background-color: ${theme.colors.lightGray};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${theme.colors.primary};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primary}22;
  }
  
  &:disabled {
    background-color: ${theme.colors.lightGray};
    cursor: not-allowed;
  }
`;

export const Label = styled.label`
  display: block;
  margin-bottom: ${theme.spacing.xs};
  font-size: 14px;
  font-weight: 600;
  color: ${theme.colors.textDark};
`;

export const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const PasswordWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const PasswordField = styled(Input)`
  padding-right: 96px;
`;

const PasswordToggle = styled.button`
  position: absolute;
  top: 50%;
  right: ${theme.spacing.sm};
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: ${theme.colors.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const PasswordInput = ({ disabled, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <PasswordWrapper>
      <PasswordField
        {...props}
        type={isVisible ? 'text' : 'password'}
        disabled={disabled}
      />
      <PasswordToggle
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        disabled={disabled}
        aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {isVisible ? 'Скрыть' : 'Показать'}
      </PasswordToggle>
    </PasswordWrapper>
  );
};
