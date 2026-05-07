import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { assistantAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { theme } from '../styles/theme';

const FloatingButton = styled.button`
  position: fixed;
  right: ${theme.spacing.lg};
  bottom: ${theme.spacing.lg};
  width: 56px;
  height: 56px;
  border-radius: ${theme.borderRadius.full};
  border: none;
  background: ${theme.colors.primary};
  color: ${theme.colors.white};
  font-size: 24px;
  cursor: pointer;
  box-shadow: ${theme.shadows.lg};
  z-index: 1200;

  &:hover {
    background: ${theme.colors.primaryDark};
  }
`;

const Panel = styled.div`
  position: fixed;
  right: ${theme.spacing.lg};
  bottom: 92px;
  width: min(420px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 140px));
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.lg};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1200;
`;

const Header = styled.div`
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  color: ${theme.colors.white};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.div`
  font-weight: 700;
  font-size: 16px;
`;

const HeaderMeta = styled.div`
  font-size: 12px;
  opacity: 0.95;
`;

const CloseButton = styled.button`
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: ${theme.colors.white};
  width: 28px;
  height: 28px;
  border-radius: ${theme.borderRadius.full};
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
  background: ${theme.colors.lightGray};
`;

const Bubble = styled.div`
  max-width: 90%;
  margin-bottom: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  white-space: pre-line;
  line-height: 1.35;
  font-size: 14px;
  background: ${({ role }) => (role === 'assistant' ? theme.colors.white : theme.colors.primary)};
  color: ${({ role }) => (role === 'assistant' ? theme.colors.textDark : theme.colors.white)};
  margin-left: ${({ role }) => (role === 'assistant' ? '0' : 'auto')};
  box-shadow: ${theme.shadows.sm};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin: -2px 0 ${theme.spacing.sm};
`;

const ActionButton = styled.button`
  border: 1px solid ${theme.colors.gray};
  background: ${theme.colors.white};
  color: ${theme.colors.textDark};
  border-radius: ${theme.borderRadius.full};
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primaryDark};
  }
`;

const Composer = styled.form`
  border-top: 1px solid ${theme.colors.gray};
  padding: ${theme.spacing.md};
  background: ${theme.colors.white};
  display: flex;
  gap: ${theme.spacing.sm};
`;

const Input = styled.input`
  flex: 1;
  border: 1px solid ${theme.colors.gray};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.lightGray};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primary}22;
  }
`;

const SendButton = styled.button`
  border: none;
  background: ${theme.colors.primary};
  color: ${theme.colors.white};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${theme.colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const QUICK_PROMPTS = [
  'Что делать на этой странице?',
  'Какие у меня права по роли?',
  'Как провести ревизию?',
  'Покажи подробную инструкцию',
  'Покажи сводку по данным',
];

const getWelcome = (isAuthenticated, role, pathname) => {
  if (!isAuthenticated) {
    return {
      text: 'Я помогу по системе ревизий. После входа покажу шаги по вашей роли.',
      actions: [],
    };
  }

  const currentPage =
    pathname.startsWith('/incoming') ? 'Поступления'
      : pathname.startsWith('/recipe-cards') ? 'Технологические карты'
        : pathname.startsWith('/nomenclature') ? 'Номенклатура'
          : pathname.startsWith('/ingredient-inventories') ? 'Текущие остатки'
            : pathname.startsWith('/cabinet') ? 'Кабинет'
              : 'Ревизии';

  const roleTitle = role ? `Роль: ${role}.` : '';
  return {
    text: `Я ассистент Product Revision. ${roleTitle}\nТекущая страница: ${currentPage}.`,
    actions: [
      { label: 'Ревизии', path: '/' },
      { label: 'Как это работает', path: '/how-it-works' },
    ],
  };
};

const localFallback = (question, role) => {
  const text = (question || '').toLowerCase();
  if (text.includes('раздел') || text.includes('доступ')) {
    return {
      text: 'Сервис ассистента временно недоступен. Базовые разделы: Ревизии, Поступления, Технологические карты.',
      actions: [
        { label: 'Ревизии', path: '/' },
        { label: 'Поступления', path: '/incoming' },
        { label: 'Технологические карты', path: '/recipe-cards' },
        { label: 'Как это работает', path: '/how-it-works' },
      ],
    };
  }

  if (role === 'manager') {
    return {
      text: 'Сервис ассистента временно недоступен. Вы можете работать через Ревизии, Поступления, Технологические карты и Кабинет.',
      actions: [
        { label: 'Ревизии', path: '/' },
        { label: 'Кабинет', path: '/cabinet' },
        { label: 'Как это работает', path: '/how-it-works' },
      ],
    };
  }

  return {
    text: 'Сервис ассистента временно недоступен. Повторите запрос позже или перейдите в раздел Ревизии.',
    actions: [
      { label: 'Ревизии', path: '/' },
      { label: 'Как это работает', path: '/how-it-works' },
    ],
  };
};

export const AssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [messages, setMessages] = useState([]);

  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || null;

  const welcome = useMemo(
    () => getWelcome(isAuthenticated, role, location.pathname),
    [isAuthenticated, role, location.pathname]
  );

  useEffect(() => {
    if (!hasUserInteracted) {
      setMessages([{ id: 1, role: 'assistant', text: welcome.text, actions: welcome.actions }]);
    }
  }, [welcome, hasUserInteracted]);

  const ask = async (rawQuestion) => {
    const text = (rawQuestion || '').trim();
    if (!text || loading) return;

    setHasUserInteracted(true);
    const userMessage = { id: Date.now(), role: 'user', text };
    const historyForApi = [...messages, userMessage]
      .slice(-10)
      .map(msg => ({ role: msg.role, text: msg.text }));

    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await assistantAPI.chat({
        message: text,
        history: historyForApi,
        context: {
          pathname: location.pathname,
          title: document.title,
        },
      });

      const payload = response.data || {};
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: typeof payload.text === 'string' && payload.text.trim()
          ? payload.text.trim()
          : 'Не получилось сформировать ответ. Сформулируйте вопрос иначе.',
        actions: Array.isArray(payload.actions) ? payload.actions : [],
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const fallback = localFallback(text, role);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: fallback.text,
          actions: fallback.actions || [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await ask(question);
  };

  return (
    <>
      {isOpen && (
        <Panel>
          <Header>
            <div>
              <HeaderTitle>🤖 Ассистент</HeaderTitle>
              <HeaderMeta>Навигация и помощь по работе</HeaderMeta>
            </div>
            <CloseButton type="button" onClick={() => setIsOpen(false)}>×</CloseButton>
          </Header>

          <Messages>
            {messages.map(message => (
              <div key={message.id}>
                <Bubble role={message.role}>{message.text}</Bubble>
                {message.role === 'assistant' && Array.isArray(message.actions) && message.actions.length > 0 && (
                  <Actions>
                    {message.actions.map(action => (
                      <ActionButton
                        key={`${message.id}-${action.path}-${action.label}`}
                        type="button"
                        onClick={() => navigate(action.path)}
                      >
                        {action.label}
                      </ActionButton>
                    ))}
                  </Actions>
                )}
              </div>
            ))}

            {loading && (
              <Bubble role="assistant">Думаю над ответом...</Bubble>
            )}

            <Actions>
              {QUICK_PROMPTS.map(prompt => (
                <ActionButton
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </ActionButton>
              ))}
            </Actions>
          </Messages>

          <Composer onSubmit={handleSubmit}>
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Спросите: что делать дальше?"
              disabled={loading}
            />
            <SendButton type="submit" disabled={loading || !question.trim()}>
              {loading ? '...' : 'Отправить'}
            </SendButton>
          </Composer>
        </Panel>
      )}

      <FloatingButton
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Открыть помощника"
      >
        🤖
      </FloatingButton>
    </>
  );
};
