# SyncBoard

SyncBoard is a production-ready full-stack team task manager for internal company use. Admins manage users, projects, and tasks; members manage assigned work with secure role-based access.

## Features
- JWT authentication (signup, login, logout, me)
- Role-based authorization (Admin / Member)
- Projects module with members, progress, filters, sort
- Tasks module with assignment, status updates, comments
- Team presence and dashboard analytics
- Admin Users management (create/edit/disable/delete/reset password)
- Responsive modern UI with custom components, toasts, modals, empty/loading/error states
- Railway-ready deployment setup

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: Prisma + SQLite
- Validation: Zod
- Auth: JWT + bcryptjs
- Deployment: Railway + Dockerfile

## Folder Structure
```txt
team-task-manager/
├─ backend/
│  ├─ index.js
│  ├─ routes/
│  ├─ middleware/
│  ├─ lib/
│  ├─ utils/
│  ├─ prisma/
│  └─ package.json
├─ frontend/
│  ├─ src/
│  ├─ vite.config.js
│  └─ package.json
├─ .env.example
├─ Dockerfile
├─ railway.toml
└─ package.json
```

## Environment Variables
Use `.env.example` as reference.

Required:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `CLIENT_URL`

Optional:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

## Local Setup
1. Install dependencies:
```bash
npm install
```

2. Create `backend/.env` using values from `.env.example`.

3. Setup database:
```bash
npm run db:migrate
npm run db:seed
```

4. Run frontend + backend:
```bash
npm run dev
```

Local URLs:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/api`

## Run Frontend Only
```bash
npm run dev:frontend
```

## Run Backend Only
```bash
npm run dev:backend
```

## Build and Start (Production Mode)
```bash
npm run build
npm run start
```

## Database Commands
```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
```

## Railway Deployment
1. Push repo to GitHub.
2. Create Railway project from GitHub repo.
3. Use included `Dockerfile` + `railway.toml`.
4. Set Railway variables:
   - `DATABASE_URL` (for Railway SQLite volume: `file:/data/dev.db`)
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `PORT` (Railway injects this automatically)
   - `CLIENT_URL=https://<your-railway-domain>`
5. Deploy.

Startup command (from `railway.toml`):
```bash
npm run start:railway
```
This runs migrations and then starts backend.

## Default Admin Creation
- `npm run db:seed` creates/upserts one admin user from:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_NAME`
- Seed does **not** create fake projects/tasks by default.

## Production Notes
- Backend binds to `process.env.PORT`.
- `DATABASE_URL` is the only DB connection source.
- Frontend uses relative API base (`/api`) — no hardcoded localhost for production API calls.
- CORS supports configured `CLIENT_URL` (comma-separated origins supported).

