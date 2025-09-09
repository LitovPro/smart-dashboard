# 🚀 Инструкции по деплою

## Варианты деплоя

### 1. Vercel (Рекомендуется)

1. **Подготовка:**
   ```bash
   npm run build
   ```

2. **Деплой:**
   - Зайдите на [vercel.com](https://vercel.com)
   - Подключите GitHub репозиторий
   - Vercel автоматически определит настройки из `vercel.json`

3. **Переменные окружения:**
   - Не требуются для данного проекта

### 2. Railway

1. **Подготовка:**
   ```bash
   npm run build
   ```

2. **Деплой:**
   - Зайдите на [railway.app](https://railway.app)
   - Подключите GitHub репозиторий
   - Railway использует настройки из `railway.json`

### 3. Heroku

1. **Подготовка:**
   ```bash
   npm run build
   ```

2. **Создайте Procfile:**
   ```
   web: cd server && npm start
   ```

3. **Деплой:**
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

### 4. DigitalOcean App Platform

1. **Подготовка:**
   ```bash
   npm run build
   ```

2. **Создайте .do/app.yaml:**
   ```yaml
   name: smart-items-dashboard
   services:
   - name: web
     source_dir: /
     github:
       repo: LitovPro/Smart-Items-Dashboard
       branch: main
     run_command: cd server && npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
   ```

## 🔧 Локальная разработка

```bash
# Клонирование
git clone git@github.com:LitovPro/Smart-Items-Dashboard.git
cd Smart-Items-Dashboard

# Установка зависимостей
npm run install:all

# Запуск в режиме разработки
npm run dev
```

## 📝 Примечания

- Приложение использует in-memory хранилище, поэтому данные не сохраняются между перезапусками
- Для продакшена рекомендуется добавить базу данных (PostgreSQL, MongoDB)
- Все API endpoints доступны по пути `/api/*`
- Frontend статические файлы обслуживаются из `/client/dist/`

## 🌐 Демо

После деплоя приложение будет доступно по адресу:
- Vercel: `https://smart-items-dashboard.vercel.app`
- Railway: `https://smart-items-dashboard.railway.app`
- Heroku: `https://smart-items-dashboard.herokuapp.com`
