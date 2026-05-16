FROM node:20-alpine AS app
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm install --prefix frontend && npm install --prefix backend
RUN npm --prefix frontend run build && npm --prefix backend run build

ENV NODE_ENV=production

EXPOSE 8080
CMD ["sh", "-c", "npm run start:railway"]
