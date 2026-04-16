FROM node:22.15.0-alpine3.21

WORKDIR /app

# Копируем зависимости
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходники
COPY search.js ./

# Команда по умолчанию
ENTRYPOINT ["node", "search.js"]