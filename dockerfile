# Берем последнюю версию Ubuntu
FROM ubuntu:latest

# Отключаем интерактивные вопросы при установке (чтобы не висло на выборе таймзоны)
ENV DEBIAN_FRONTEND=noninteractive

# Обновляем систему и ставим набор "джентльмена" для тестов:
# curl, ping, nano (редактор), git, python3 и htop
RUN apt-get update && apt-get install -y \
    curl \
    iputils-ping \
    nano \
    git \
    python3 \
    htop \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Создаем папку, где будем сидеть
WORKDIR /my_playground

# ГЛАВНОЕ: Эта команда заставляет контейнер работать вечно и ждать твоих команд.
# (tail читает пустоту бесконечно)
CMD ["tail", "-f", "/dev/null"]