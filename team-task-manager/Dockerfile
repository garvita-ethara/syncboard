FROM node:20-alpine AS app
WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

RUN npm install

COPY . .

RUN npm --prefix backend run db:generate

RUN npm --prefix frontend run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["sh", "-c", "npm run start:railway"]
