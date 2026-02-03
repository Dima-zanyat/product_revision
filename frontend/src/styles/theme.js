/**
 * Тема приложения (белый и оранжевый)
 */

export const theme = {
  colors: {
    primary: '#FF9500',
    primaryLight: '#FFB84D',
    primaryDark: '#E67E00',
    
    white: '#FFFFFF',
    lightGray: '#F5F5F5',
    gray: '#E0E0E0',
    darkGray: '#666666',
    textDark: '#333333',
    textLight: '#999999',
    
    success: '#4CAF50',
    warning: '#FFD700',
    danger: '#FF6B6B',
    
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 20px rgba(0, 0, 0, 0.15)',
  },
};

export const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    background-color: ${theme.colors.lightGray};
    color: ${theme.colors.textDark};
  }
  
  input, textarea, select {
    font-family: inherit;
  }
`;