/**
 * Table компонент
 */

import styled from 'styled-components';
import { theme } from '../styles/theme';

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  box-shadow: ${theme.shadows.sm};
`;

export const TableHeader = styled.thead`
  background: ${theme.colors.primary};
  color: white;
`;

export const TableHeaderCell = styled.th`
  padding: ${theme.spacing.md};
  text-align: left;
  font-weight: 600;
  font-size: 14px;
`;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr`
  border-bottom: 1px solid ${theme.colors.gray};
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${theme.colors.lightGray};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

export const TableCell = styled.td`
  padding: ${theme.spacing.md};
  font-size: 14px;
  color: ${theme.colors.textDark};
`;

export const TableContainer = styled.div`
  overflow-x: auto;
  margin: ${theme.spacing.lg} 0;
`;
