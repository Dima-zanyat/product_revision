/**
 * Modal компонент
 */

import { useEffect } from 'react';
import { useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${theme.spacing.lg};
`;

const ModalContent = styled.div`
  background: white;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${theme.shadows.lg};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 2px solid ${theme.colors.lightGray};
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: ${theme.colors.textDark};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${theme.colors.textLight};
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.full};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${theme.colors.lightGray};
    color: ${theme.colors.textDark};
  }
`;

const ModalBody = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ModalFooter = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
  padding-top: ${theme.spacing.md};
  border-top: 2px solid ${theme.colors.lightGray};
`;

export const Modal = ({ isOpen, onClose, title, children, footer }) => {
  const shouldCloseOnMouseUpRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Overlay
      onMouseDown={(e) => {
        shouldCloseOnMouseUpRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (shouldCloseOnMouseUpRef.current && e.target === e.currentTarget) {
          onClose();
        }
        shouldCloseOnMouseUpRef.current = false;
      }}
    >
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>
        <ModalBody>{children}</ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </Overlay>
  );
};
