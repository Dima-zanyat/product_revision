import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./store/authStore', () => ({
  useAuthStore: () => ({ checkAuth: jest.fn() }),
}));

jest.mock('./services/api', () => ({
  authAPI: { getCsrfToken: jest.fn(() => Promise.resolve({ data: {} })) },
}));

jest.mock('./components/Layout', () => ({
  Layout: ({ children }) => <div>{children}</div>,
}));

jest.mock('./components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }) => <>{children}</>,
}));

jest.mock('./pages/RevisionListPage', () => ({
  RevisionListPage: () => <div>Revision List</div>,
}));

jest.mock('./pages/RevisionDetailPage', () => ({
  RevisionDetailPage: () => <div>Revision Detail</div>,
}));

jest.mock('./pages/RevisionCreatePage', () => ({
  RevisionCreatePage: () => <div>Revision Create</div>,
}));

jest.mock('./pages/RecipeCardsPage', () => ({
  RecipeCardsPage: () => <div>Recipe Cards</div>,
}));

jest.mock('./pages/ManagerCabinetPage', () => ({
  ManagerCabinetPage: () => <div>Manager Cabinet</div>,
}));

test('renders app routes', () => {
  render(<App />);
  expect(screen.getByText('Revision List')).toBeInTheDocument();
});
