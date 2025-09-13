FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/out ./out

RUN npm install -g serve@latest

EXPOSE 3000

CMD ["npx", "serve@latest", "out", "-p", "3000"]
