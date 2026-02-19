# 📊 Product Revision

**Product Revision** — это веб‑приложение для контроля остатков продуктов и ингредиентов, проведения ревизий и формирования отчетов по расхождениям.

Проект разработан как внутренняя система для производства, складов и бухгалтерии.

---

## 🚀 Основные возможности

- 🔐 Аутентификация пользователей (Django + session auth)
- 👥 Роли пользователей:
  - Администратор
  - Менеджер / директор
  - Сотрудник производства
  - Бухгалтерия
- 📦 Создание и ведение ревизий
- 🧾 Учет фактических остатков продуктов и ингредиентов
- 📊 Автоматический расчет:
  - разницы между ожидаемым и фактическим количеством
  - процента расхождения
- 📄 Детальный отчет по каждой ревизии
- ⚛️ Современный frontend на React
- 🎨 Единый дизайн и тема приложения
- 🤖 Встроенный ассистент в интерфейсе (чат-помощник)

---

## 🧱 Архитектура проекта

```
product_revision/
│
├── users/
├── revisions/
├── products/
├── ingredients/
├── config/
│
├── frontend/ (React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── services/
│   │   └── styles/
│   └── public/
│
└── README.md
```

---

## ⚙️ Backend

**Технологии:**
- Python 3.10+
- Django
- Django REST Framework
- PostgreSQL (в продакшене)
- SQLite (локально)

### Установка backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API будет доступно по адресу:
```
http://127.0.0.1:8000/api/
```

---

## ⚛️ Frontend

**Технологии:**
- React
- React Router
- Zustand (store)
- Axios
- Styled-components

### Установка frontend

```bash
cd frontend
npm install
npm start
```

Frontend будет доступен по адресу:
```
http://localhost:3000
```

---

## 🔐 Аутентификация

- Пользователи создаются **администратором или менеджером** через Django Admin
- Авторизация происходит через frontend
- Используется session‑based auth + CSRF protection

---

## 📡 API эндпоинты (основные)

```
GET    /api/revisions/
POST   /api/revisions/
GET    /api/revisions/{id}/

GET    /api/revision-product-items/
GET    /api/revision-ingredient-items/
GET    /api/revision-reports/
POST   /api/assistant/chat/
```

---

## 📦 Production (кратко)

- Backend: Django + Gunicorn
- Frontend: React build
- Web server: Nginx
- HTTPS: Let’s Encrypt

---

## 🎨 UI / UX

- Единый дизайн‑гайд
- Адаптивная верстка
- Собственный логотип и favicon

---
## 🐳 Docker / Production

### Запуск через Docker Compose

```bash
# Собрать и запустить контейнеры
docker compose up -d --build

# Применить миграции
docker compose exec backend python manage.py migrate

# Создать суперпользователя
docker compose exec backend python manage.py createsuperuser

# Собрать статику для frontend
docker compose exec backend python manage.py collectstatic --noinput
```

## ☁️ Deploy на Render (product-revision.onrender.com)

Проект подготовлен для деплоя как **один web‑сервис** (Django + собранный React) в Docker (см. `Dockerfile`).

**Переменные окружения (Render → Environment):**
- `DATABASE_URL` — строка подключения к PostgreSQL (Render Postgres)
- `SECRET_KEY` — секретный ключ Django
- `ENVIRONMENT=production`
- `USE_HTTPS=true`

**Healthcheck:**
- `GET /api/health/` → `{ "status": "ok" }`

SPA отдаётся на всех путях кроме `admin/` и `api/`.


## 🧪 Статус проекта

🟡 В активной разработке

Планируется:
- Docker
- CI/CD
- Расширенная система отчетов
- Экспорт в Excel / PDF

---

## 👨‍💻 Авторы

Проект разработан в рамках учебного и практического проекта.

---

## 📄 Лицензия

MIT License

# Реакт

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
