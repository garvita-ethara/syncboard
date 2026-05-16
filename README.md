# 🌌 SyncBoard

**A premium, obsidian-grade task management ecosystem for elite teams.**

SyncBoard is a production-ready full-stack orchestration platform designed for high-performance internal team collaboration. Featuring a refined "Obsidian Night" aesthetic, it combines military-grade reliability with an Apple-inspired minimalist interface.

![Obsidian Night UI](https://img.shields.io/badge/UI-Obsidian%20Night-black?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Prisma%20%7C%20PostgreSQL-blue?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deployment-Railway-green?style=for-the-badge)

---

## ✨ Features

- **🔐 Enterprise Auth**: JWT-powered secure sessions with role-based access control (Admin/Member).
- **📊 Precision Dashboard**: Real-time analytics and presence tracking for team visibility.
- **📁 Advanced Projects**: Deep project hierarchy with member management, status tracking, and priority weighting.
- **✅ Granular Tasks**: Comprehensive task lifecycle management with assignment, status updates, and threaded comments.
- **🎨 Obsidian Night UI**: A breathtaking, breathable dark-mode interface optimized for focus and spatial clarity.
- **🚀 Cloud-Native**: Fully containerized and optimized for one-click Railway deployment.

---

## 🛠 Tech Stack

- **Core**: React 18 + Vite (Frontend), Node.js + Express (Backend)
- **Database**: Prisma ORM + PostgreSQL
- **Security**: JWT Authentication, bcryptjs password hashing
- **Validation**: Zod schema validation
- **Styling**: Vanilla CSS with a custom-engineered "Obsidian Night" design system
- **Infrastructure**: Docker + Railway

---

## 📂 Project Structure

```txt
team-task-manager/
├─ backend/             # Node.js API & Prisma Models
├─ frontend/            # React SPA (Vite)
├─ Dockerfile           # Optimized Multi-stage Build
├─ railway.toml         # Deployment Configuration
└─ package.json         # Monorepo Workspace Root
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- PostgreSQL (Local or Cloud)

### 1. Installation
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the `backend/` directory using the provided `.env.example`.

### 3. Database Initialization
```bash
npm run db:generate    # Generate Prisma Client
npm run db:deploy      # Push schema to database
npm run db:seed        # Create default Admin user
```

### 4. Development Mode
```bash
npm run dev
```
*Frontend: `http://localhost:5173` | Backend: `http://localhost:8081/api`*

---

## ☁️ Deployment (Railway)

1. **Connect** your repository to Railway.
2. **Add PostgreSQL Plugin** to your project.
3. **Set Environment Variables**:
   - `DATABASE_URL`: (Auto-injected by Railway)
   - `JWT_SECRET`: (Any secure random string)
   - `NODE_ENV`: `production`
4. **Deploy**. SyncBoard will automatically handle migrations and seeding on first startup.

---

## 🛡 Security & Best Practices

- **JWT_SECRET**: Required in production. The app will fail-safe if not provided.
- **Relative API**: Frontend uses `/api` base, eliminating CORS issues and hardcoded URLs.
- **Static Assets**: Backend serves the production frontend bundle from `dist/public`.

---

© 2024 SyncBoard. Premium Productivity.
