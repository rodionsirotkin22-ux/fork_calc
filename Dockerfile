FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/out ./out

RUN npm install -g serve@latest

EXPOSE 3000

CMD ["npx", "serve@latest", "out", "-p", "3000"]
