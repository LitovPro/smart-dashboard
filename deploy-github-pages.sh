#!/bin/bash

# Скрипт для деплоя на GitHub Pages
echo "🚀 Начинаем деплой на GitHub Pages..."

# Установка зависимостей
echo "📦 Устанавливаем зависимости..."
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Сборка клиента
echo "🔨 Собираем клиент..."
cd client
npm run build
cd ..

# Сборка сервера
echo "🔨 Собираем сервер..."
cd server
npm run build
cd ..

# Копируем собранные файлы в корень для GitHub Pages
echo "📁 Копируем файлы..."
cp -r client/dist/* ./
cp -r server/dist ./api

# Создаем index.html для GitHub Pages
echo "📝 Создаем index.html..."
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Items Dashboard</title>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
</body>
</html>
EOF

echo "✅ Деплой готов! Теперь можно коммитить и пушить в GitHub."
