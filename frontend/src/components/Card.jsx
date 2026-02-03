/**
 * Card компонент
 */

import styled from 'styled-components';
import { theme } from '../styles/theme';

export const Card = styled.div`
  background: white;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  box-shadow: ${theme.shadows.sm};
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${theme.shadows.md};
    transform: translateY(-2px);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 2px solid ${theme.colors.lightGray};
`;

export const CardTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${theme.colors.textDark};
`;

export const CardContent = styled.div`
  color: ${theme.colors.textDark};
`;