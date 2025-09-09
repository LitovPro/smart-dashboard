# 🚀 Развертывание на собственном сервере

## 📋 Требования

- **Сервер:** Ubuntu 20.04+ или CentOS 8+
- **Docker:** 20.10+
- **Docker Compose:** 2.0+
- **Nginx:** 1.18+
- **Домен:** купленный на reg.ru

## 🔧 Установка зависимостей

### 1. Установка Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Установка Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

## 📦 Развертывание приложения

### 1. Клонирование репозитория

```bash
git clone https://github.com/LitovPro/Smart-Items-Dashboard.git
cd Smart-Items-Dashboard
```

### 2. Запуск приложения

```bash
# Сделать скрипт исполняемым
chmod +x deploy.sh

# Запустить развертывание
./deploy.sh
```

### 3. Проверка работы

```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить логи
docker-compose logs -f

# Проверить доступность
curl http://localhost:3000/health
```

## 🌐 Настройка домена

### 1. Покупка домена на reg.ru

1. Перейдите на [reg.ru](https://reg.ru)
2. Выберите и купите домен (например: `smartitems.ru` или `itemsdashboard.ru`)
3. В настройках DNS укажите A-запись на IP вашего сервера

### 2. Настройка Nginx

```bash
# Скопировать конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/smart-items-dashboard

# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/smart-items-dashboard /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

### 3. Настройка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавить строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 Обновление приложения

```bash
# Остановить контейнеры
docker-compose down

# Обновить код
git pull origin main

# Пересобрать и запустить
./deploy.sh
```

## 📊 Мониторинг

### Логи приложения
```bash
docker-compose logs -f smart-items-dashboard
```

### Статус контейнеров
```bash
docker-compose ps
```

### Использование ресурсов
```bash
docker stats
```

## 🛡️ Безопасность

### Firewall
```bash
# Ubuntu/Debian
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Автоматические обновления
```bash
# Ubuntu/Debian
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 🎯 Готовые ссылки

После настройки у вас будет:
- **Домен:** `https://your-domain.com`
- **GitHub:** `https://github.com/LitovPro/Smart-Items-Dashboard`

## 🆘 Устранение неполадок

### Приложение не запускается
```bash
# Проверить логи
docker-compose logs

# Проверить порты
netstat -tlnp | grep :3000
```

### Nginx не работает
```bash
# Проверить конфигурацию
sudo nginx -t

# Проверить статус
sudo systemctl status nginx

# Перезапустить
sudo systemctl restart nginx
```

### SSL проблемы
```bash
# Проверить сертификаты
sudo certbot certificates

# Обновить сертификаты
sudo certbot renew
```
