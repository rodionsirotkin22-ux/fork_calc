#Сборка
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

#Финальный образ
FROM node:18-alpine
WORKDIR /app

#Копия статических файлов
COPY --from=builder /app/out ./out

#Копия package.json и server.ls
COPY package*.json ./
COPY server.cjs ./

#Установка зависимостей
RUN npm install --only=production

EXPOSE 3000

CMD ["node", "server.cjs"]
