import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { useAuthStore } from '../store/authStore';

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
  width: min(400px, calc(100vw - 32px));
  height: min(580px, calc(100vh - 140px));
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
`;

const QUICK_PROMPTS = [
  'Что делать на этой странице?',
  'Покажи доступные разделы',
  'Какие у меня права по роли?',
];

const SECTION_DEFINITIONS = [
  {
    key: 'revisions',
    path: '/',
    title: 'Ревизии',
    description: 'Создание ревизий, заполнение продаж/номенклатуры, расчет и подтверждение.',
    visibleFor: ['admin', 'manager', 'accounting', 'staff'],
    match: (pathname) => pathname === '/' || pathname.startsWith('/revisions'),
  },
  {
    key: 'incoming',
    path: '/incoming',
    title: 'Поступления',
    description: 'Ввод и контроль поступлений позиции номенклатуры по точкам.',
    visibleFor: ['admin', 'manager', 'accounting', 'staff'],
    match: (pathname) => pathname.startsWith('/incoming'),
  },
  {
    key: 'recipe-cards',
    path: '/recipe-cards',
    title: 'Технологические карты',
    description: 'Состав продукта: позиции номенклатуры и нормы расхода в граммах.',
    visibleFor: ['admin', 'manager', 'accounting', 'staff'],
    match: (pathname) => pathname.startsWith('/recipe-cards'),
  },
  {
    key: 'inventories',
    path: '/ingredient-inventories',
    title: 'Текущие остатки',
    description: 'Сводка текущих остатков позиции номенклатуры (для менеджера).',
    visibleFor: ['manager'],
    match: (pathname) => pathname.startsWith('/ingredient-inventories'),
  },
  {
    key: 'cabinet',
    path: '/cabinet',
    title: 'Кабинет',
    description: 'Управление профилем, производством, точками и пользователями.',
    visibleFor: ['manager'],
    match: (pathname) => pathname.startsWith('/cabinet'),
  },
];

const getAvailableSections = (role) => (
  SECTION_DEFINITIONS.filter(section => section.visibleFor.includes(role))
);

const getCurrentSection = (pathname) => (
  SECTION_DEFINITIONS.find(section => section.match(pathname)) || null
);

const roleDescription = (role) => {
  if (role === 'staff') {
    return (
      'Ваша роль: staff.\n'
      + 'Вы заполняете ревизию: продажи, номенклатуру и поступления.\n'
      + 'В ревизии доступна отправка на проверку менеджеру.'
    );
  }

  if (['admin', 'manager', 'accounting'].includes(role)) {
    return (
      `Ваша роль: ${role}.\n`
      + 'Вы можете вести ревизию полностью: заполнять, рассчитывать и подтверждать.\n'
      + 'Также можно пересчитывать ревизию и управлять рабочими данными.'
    );
  }

  return 'Роль не определена. Войдите в систему, чтобы получить персональные подсказки.';
};

const buildWelcomeMessage = ({ isAuthenticated, role, pathname }) => {
  if (!isAuthenticated) {
    return {
      text:
        'Я помогу работать в системе ревизий.\n'
        + 'Сначала войдите в аккаунт, после этого я покажу доступные разделы и шаги.',
      actions: [],
    };
  }

  const current = getCurrentSection(pathname);
  const sections = getAvailableSections(role);
  return {
    text:
      'Я ваш ассистент по системе.\n'
      + (current ? `Сейчас вы на странице: ${current.title}.\n` : '')
      + 'Спросите: "что делать на этой странице", "права роли", "как провести ревизию".',
    actions: sections.slice(0, 3).map(section => ({
      label: section.title,
      path: section.path,
    })),
  };
};

const buildCurrentPageHelp = ({ role, pathname }) => {
  const current = getCurrentSection(pathname);
  if (!current) {
    return {
      text: 'Сейчас открыта служебная страница. Перейдите в рабочий раздел через кнопки ниже.',
      actions: getAvailableSections(role).slice(0, 4).map(section => ({ label: section.title, path: section.path })),
    };
  }

  if (current.key === 'revisions') {
    return {
      text:
        'Ревизии:\n'
        + '1) Создайте ревизию и заполните продажи.\n'
        + '2) Заполните номенклатуру и при необходимости поступления.\n'
        + '3) Выполните расчет ревизии и проверьте отчет.',
      actions: [
        { label: 'Список ревизий', path: '/' },
        { label: 'Новая ревизия', path: '/revisions/new' },
      ],
    };
  }

  if (current.key === 'incoming') {
    return {
      text:
        'Поступления:\n'
        + 'Вносите количество в граммах, указывайте точку и дату.\n'
        + 'Эти данные участвуют в расчете остатков и отчета по ревизии.',
      actions: [{ label: 'Открыть ревизии', path: '/' }],
    };
  }

  if (current.key === 'recipe-cards') {
    return {
      text:
        'Технологические карты:\n'
        + 'Для каждого продукта задайте позиции номенклатуры и расход в граммах.\n'
        + 'Эти нормы используются в расчете ожидаемых остатков.',
      actions: [{ label: 'Открыть ревизии', path: '/' }],
    };
  }

  if (current.key === 'inventories') {
    return {
      text:
        'Текущие остатки:\n'
        + 'Показывают актуальные отклонения по позициям номенклатуры.\n'
        + 'Используйте фильтры и переходите в ревизию для детальной проверки.',
      actions: [{ label: 'Список ревизий', path: '/' }],
    };
  }

  if (current.key === 'cabinet') {
    return {
      text:
        'Кабинет менеджера:\n'
        + 'Здесь редактируется профиль/производство, точки и пользователи.\n'
        + 'Создавайте сотрудников staff/accounting и поддерживайте структуру производства.',
      actions: [{ label: 'Список ревизий', path: '/' }],
    };
  }

  return {
    text: `${current.title}: ${current.description}`,
    actions: [],
  };
};

const buildReply = ({ question, isAuthenticated, role, pathname }) => {
  const normalized = question.trim().toLowerCase();

  if (!isAuthenticated) {
    return {
      text:
        'Для персональных подсказок нужно войти в аккаунт.\n'
        + 'После входа я покажу доступные вам разделы и действия.',
      actions: [],
    };
  }

  if (!normalized) {
    return buildCurrentPageHelp({ role, pathname });
  }

  if (normalized.includes('что делать') || normalized.includes('эта страниц') || normalized.includes('этой страниц')) {
    return buildCurrentPageHelp({ role, pathname });
  }

  if (normalized.includes('прав') || normalized.includes('роль') || normalized.includes('могу')) {
    return {
      text: roleDescription(role),
      actions: getAvailableSections(role).slice(0, 4).map(section => ({ label: section.title, path: section.path })),
    };
  }

  if (normalized.includes('доступ') || normalized.includes('раздел') || normalized.includes('ссылк') || normalized.includes('страниц')) {
    const sections = getAvailableSections(role);
    return {
      text:
        'Доступные разделы:\n'
        + sections.map((section, index) => `${index + 1}) ${section.title} — ${section.description}`).join('\n'),
      actions: sections.map(section => ({ label: section.title, path: section.path })),
    };
  }

  if (normalized.includes('ревиз')) {
    return {
      text:
        'Как провести ревизию:\n'
        + '1) Создайте ревизию и заполните продажи.\n'
        + '2) Заполните фактическую номенклатуру и поступления.\n'
        + '3) Нажмите "Рассчитать ревизию", проверьте отчет и подтвердите.',
      actions: [
        { label: 'Список ревизий', path: '/' },
        { label: 'Создать ревизию', path: '/revisions/new' },
      ],
    };
  }

  if (normalized.includes('поступлен')) {
    return {
      text:
        'Поступления вносятся в граммах и учитываются в остатках.\n'
        + 'Их можно вести отдельно на странице "Поступления" или внутри конкретной ревизии.',
      actions: [{ label: 'Поступления', path: '/incoming' }, { label: 'Ревизии', path: '/' }],
    };
  }

  if (normalized.includes('тех') || normalized.includes('карт') || normalized.includes('рецепт')) {
    return {
      text:
        'Технологическая карта определяет расход позиций номенклатуры на 1 продукт.\n'
        + 'Проверьте, что нормы указаны в граммах и соответствуют фактическому производству.',
      actions: [{ label: 'Технологические карты', path: '/recipe-cards' }],
    };
  }

  if (normalized.includes('остат') || normalized.includes('склад')) {
    if (role !== 'manager') {
      return {
        text:
          'Раздел "Текущие остатки" доступен роли manager.\n'
          + 'Для сверки используйте отчет внутри ревизии.',
        actions: [{ label: 'Ревизии', path: '/' }],
      };
    }
    return {
      text: 'Откройте раздел "Текущие остатки", чтобы увидеть отклонения по номенклатуре.',
      actions: [{ label: 'Текущие остатки', path: '/ingredient-inventories' }],
    };
  }

  if (normalized.includes('кабинет') || normalized.includes('пользоват') || normalized.includes('сотрудник') || normalized.includes('профил')) {
    if (role !== 'manager') {
      return {
        text: 'Кабинет управления доступен роли manager.',
        actions: [{ label: 'Ревизии', path: '/' }],
      };
    }
    return {
      text:
        'В кабинете менеджера можно редактировать профиль и производство,\n'
        + 'управлять точками и пользователями (создание/редактирование/удаление).',
      actions: [{ label: 'Кабинет', path: '/cabinet' }],
    };
  }

  return {
    text:
      'Я пока не понял запрос полностью.\n'
      + 'Попробуйте: "что делать на этой странице", "как провести ревизию", "права роли", "доступные разделы".',
    actions: getAvailableSections(role).slice(0, 4).map(section => ({ label: section.title, path: section.path })),
  };
};

export const AssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role || null;
  const welcome = useMemo(
    () => buildWelcomeMessage({ isAuthenticated, role, pathname: location.pathname }),
    [isAuthenticated, role, location.pathname]
  );

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!hasUserInteracted) {
      setMessages([{ id: 1, role: 'assistant', text: welcome.text, actions: welcome.actions }]);
    }
  }, [welcome, hasUserInteracted]);

  const ask = (text) => {
    setHasUserInteracted(true);
    const userMessage = { id: Date.now(), role: 'user', text };
    const reply = buildReply({
      question: text,
      isAuthenticated,
      role,
      pathname: location.pathname,
    });
    const assistantMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      text: reply.text,
      actions: reply.actions || [],
    };
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setQuestion('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    ask(question);
  };

  return (
    <>
      {isOpen && (
        <Panel>
          <Header>
            <div>
              <HeaderTitle>🤖 Ассистент</HeaderTitle>
              <HeaderMeta>Подсказки по работе в системе</HeaderMeta>
            </div>
            <CloseButton type="button" onClick={() => setIsOpen(false)}>×</CloseButton>
          </Header>

          <Messages>
            {messages.map(message => (
              <div key={message.id}>
                <Bubble role={message.role}>{message.text}</Bubble>
                {message.role === 'assistant' && message.actions && message.actions.length > 0 && (
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

            <Actions>
              {QUICK_PROMPTS.map(prompt => (
                <ActionButton
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
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
              placeholder="Задайте вопрос по работе с системой..."
            />
            <SendButton type="submit">Отправить</SendButton>
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
