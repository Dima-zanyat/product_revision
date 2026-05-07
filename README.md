# 📊 Product Revision

**Product Revision** — это веб-приложение для контроля остатков продуктов и ингредиентов, проведения ревизий и формирования отчетов по расхождениям. Проект разработан как внутренняя система для производства, складов и бухгалтерии.

## 🚀 Возможности

- 🔐 Аутентификация пользователей (Django + session auth)
- 👥 Роли пользователей: Администратор, Менеджер, Сотрудник производства, Бухгалтерия
- 📦 Создание и ведение ревизий
- 🧾 Учет фактических остатков продуктов и ингредиентов
- 📊 Автоматический расчет разницы и процента расхождения
- 📄 Детальный отчет по каждой ревизии
- ⚛️ Современный frontend на React
- 🎨 Единый дизайн и тема приложения
- 🤖 Встроенный ассистент в интерфейсе (чат-помощник)
- 📘 Вкладка «Как это работает» с пошаговой инструкцией

## 🛠️ Стек технологий

### Backend
- Python 3.10+
- Django + Django REST Framework
- PostgreSQL (production) / SQLite (local)
- Docker + Docker Compose

### Frontend
- React + React Router
- Zustand (state management)
- Axios (API calls)
- Styled-components (styling)

### Deploy
- Render (web service)
- Nginx + Gunicorn
- Let's Encrypt (HTTPS)

## 🏗️ Архитектура

```
product_revision/
├── core/ (Django settings, URLs)
├── users/ (аутентификация, роли)
├── products/ (модели продуктов)
├── revisions/ (ревизии, расчеты)
├── sales/ (продажи, отчеты)
├── frontend/ (React app)
└── staticfiles/ (собранные assets)
```

### ER-диаграмма базы данных

```
User (пользователи)
├── id, username, role
└── связан с Revision (автор)

Revision (ревизии)
├── id, title, status, created_at
├── products (ManyToMany через RevisionProductItem)
└── ingredients (ManyToMany через RevisionIngredientItem)

Product (продукты)
├── id, name, expected_quantity
└── связан с RevisionProductItem

Ingredient (ингредиенты)
├── id, name, expected_quantity
└── связан с RevisionIngredientItem

RevisionProductItem (позиции продуктов в ревизии)
├── revision, product, actual_quantity, difference

RevisionIngredientItem (позиции ингредиентов)
├── revision, ingredient, actual_quantity, difference

Sale (продажи)
├── id, product, quantity, date
└── влияет на расчет остатков
```

## ⚙️ Инженерные задачи

Проект включает решение комплексных технических задач:

- **Реализация расчётной системы остатков**: Автоматический расчет разницы между ожидаемыми и фактическими остатками с учетом продаж и производства
- **Разграничение ролей пользователей (RBAC)**: Система ролей с разными уровнями доступа (админ, менеджер, сотрудник, бухгалтерия)
- **Оптимизация запросов и устранение N+1**: Использование select_related/prefetch_related в Django ORM для эффективных запросов
- **Интеграция frontend + backend в одном Docker-контейнере**: Монолитная архитектура с React, встроенным в Django, для упрощения деплоя
- **Session-based аутентификация с CSRF-защитой**: Безопасная авторизация без JWT
- **Автоматическое построение отчетов**: Генерация детальных отчетов по расхождениям в ревизиях

## 📡 API

Основные эндпоинты:

```
GET    /api/revisions/          # Список ревизий
POST   /api/revisions/          # Создать ревизию
GET    /api/revisions/{id}/     # Детали ревизии

GET    /api/revision-product-items/    # Позиции продуктов
GET    /api/revision-ingredient-items/ # Позиции ингредиентов
GET    /api/revision-reports/          # Отчеты
POST   /api/assistant/chat/            # Чат-ассистент
```

## 🐳 Docker / Deploy

### Локальный запуск
```bash
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

### Production на Render
- Один web-сервис (Django + React)
- Переменные окружения: `DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT=production`
- Healthcheck: `GET /api/health/`

## 📸 Скриншоты

### Демонстарция интерфейса и функционала приложения
  [gif](/screenshots/Реализация%20функционала.gif)

## 🚀 Запуск проекта

### Backend
```bash
python -m venv venv
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm start
```

API: http://127.0.0.1:8000/api/
Frontend: http://localhost:3000

## 🧪 Статус проекта

Проект готов к production deploy

## 👨‍💻 Автор

Проект разработан Дмитрием Алексеевичем Бревновым.

## 📄 Лицензия

MIT License