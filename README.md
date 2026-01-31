# Docker API Server

REST API сервер для управления Docker контейнерами.

## Функциональность

- ✅ Получение списка всех контейнеров (`GET /api/containers`)
- ✅ Получение информации о конкретном контейнере (`GET /api/containers/{id}`)
- ✅ Фильтрация контейнеров по статусу, имени, label
- ✅ CORS поддержка для подключения фронтенда
- ✅ Health check эндпоинт
- ✅ Подробное логирование
- ✅ Обработка ошибок Docker API

## Установка и запуск

### Вариант 1: Docker Compose (рекомендуется)

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f docker-api-server
```

### Вариант 2: Прямой запуск Python

```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера
python server.py
```

## API Эндпоинты

### GET /
Информация о сервисе

**Ответ:**
```json
{
  "service": "Docker API Server",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2024-01-15T10:30:00",
  "endpoints": {
    "containers": "/api/containers",
    "health": "/health"
  }
}
```

### GET /health
Проверка здоровья сервера

**Ответ:**
```json
{
  "status": "healthy",
  "docker_available": true,
  "timestamp": "2024-01-15T10:30:00"
}
```

### GET /api/containers
Получение списка всех контейнеров

**Параметры:**
- `status` (опционально): фильтр по статусу (running, stopped, etc.)
- `name` (опционально): фильтр по имени контейнера
- `label` (опционально): фильтр по label (формат: key=value)

**Примеры запросов:**
```bash
# Все контейнеры
curl http://localhost:8000/api/containers

# Только запущенные
curl http://localhost:8000/api/containers?status=running

# Фильтр по имени
curl http://localhost:8000/api/containers?name=nginx

# Фильтр по label
curl http://localhost:8000/api/containers?label=environment=production
```

**Ответ:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00",
  "count": 3,
  "containers": [
    {
      "id": "abc123def456",
      "name": "nginx-container",
      "image": ["nginx:latest"],
      "status": "running",
      "state": "running",
      "created": "2024-01-15T09:00:00",
      "ports": {
        "80/tcp": [{"HostIp": "0.0.0.0", "HostPort": "8080"}]
      },
      "labels": {
        "environment": "production"
      },
      "networks": ["bridge"]
    }
  ]
}
```

### GET /api/containers/{container_id}
Получение информации о конкретном контейнере

**Пример запроса:**
```bash
curl http://localhost:8000/api/containers/abc123def456
```

## Конфигурация

### Переменные окружения
- `LOG_LEVEL`: уровень логирования (DEBUG, INFO, WARNING, ERROR)
- `PYTHONPATH`: путь к Python модулям

### Порты
- `8000`: основной порт API сервера

### Требования
- Docker daemon должен быть доступен
- Доступ к `/var/run/docker.sock`

## Логи

Логи сохраняются в контейнере и доступны через:
```bash
docker-compose logs -f docker-api-server
```

## Безопасность

- Docker socket монтируется только для чтения
- CORS настроен для разработки (в продакшене указать конкретные домены)
- Пользователь app (не root) для запуска приложения