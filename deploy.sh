#!/bin/bash

# Скрипт для развертывания Smart Items Dashboard на сервере

echo "🚀 Начинаем развертывание Smart Items Dashboard..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверяем наличие docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down

# Удаляем старые образы
echo "🗑️ Удаляем старые образы..."
docker-compose down --rmi all

# Собираем новый образ
echo "🔨 Собираем новый образ..."
docker-compose build --no-cache

# Запускаем контейнеры
echo "▶️ Запускаем контейнеры..."
docker-compose up -d

# Проверяем статус
echo "📊 Проверяем статус контейнеров..."
docker-compose ps

# Проверяем логи
echo "📝 Последние логи:"
docker-compose logs --tail=20

echo "✅ Развертывание завершено!"
echo "🌐 Приложение доступно по адресу: http://your-domain.com:3000"
echo "🔍 Проверьте статус: docker-compose ps"
echo "📝 Просмотр логов: docker-compose logs -f"
