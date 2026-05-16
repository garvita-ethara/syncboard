# Team Task Manager - Quick Start Guide

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database running
- npm or yarn package manager

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file has already been created with default values. Update it with your actual configuration:

```bash
# Edit .env with your database connection
DATABASE_URL="postgresql://user:password@localhost:5432/team_task_manager?schema=public"
JWT_SECRET="your-secure-jwt-secret-here"
NODE_ENV="development"
PORT=8080
CLIENT_URL="http://localhost:5173"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with admin user
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

This will start:
- **Frontend**: React app on http://localhost:5173
- **Backend**: Express API on http://localhost:8080

### 5. Login

Use the seeded admin credentials:
- **Email**: admin@example.com
- **Password**: Admin123!

## Available Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Database
npm run db:generate     # Generate Prisma Client
npm run db:migrate      # Run pending migrations
npm run db:deploy       # Deploy migrations to production database
npm run db:seed         # Seed database with initial data

# Production
npm run build           # Build client and prepare dist folder
npm start               # Start production server

# Validation
npm run lint:check      # Check server syntax
```

## Project Structure

```
team-task-manager/
├── client/              # React Frontend
│   ├── index.html       # Entry HTML
│   └── src/
│       ├── main.jsx     # React app & components
│       └── styles.css   # Global styles
├── server/              # Express Backend
│   ├── index.js         # Main server file
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & error handling
│   ├── lib/             # Utilities (Prisma, JWT, HTTP)
│   └── utils/           # Validators & access control
├── prisma/              # Database
│   ├── schema.prisma    # Data model
│   ├── seed.js          # Seed script
│   └── migrations/      # Database migrations
├── .env                 # Environment variables
├── package.json         # Dependencies & scripts
└── vite.config.js       # Vite configuration
```

## Architecture

### Frontend (React + Vite)
- Component-based UI with context API for state management
- Authentication with JWT tokens stored in localStorage
- Features: Projects, Tasks, Team Management, Dashboard

### Backend (Node.js + Express)
- RESTful API with role-based access control
- JWT authentication with bearer tokens
- Prisma ORM for type-safe database queries
- Comprehensive error handling and validation

### Database (PostgreSQL + Prisma)
- User management with role-based access
- Project management with team membership
- Task management with assignment and status tracking
- Automatic timestamp tracking and relationships

## Key Features

✅ User authentication (signup/login)
✅ Role-based access control (ADMIN/MEMBER)
✅ Project creation and team management
✅ Task assignment and status tracking
✅ Dashboard with statistics and charts
✅ JWT-based sessions with 7-day expiration
✅ Secure password hashing with bcrypt
✅ Request validation with Zod
✅ Rate limiting on API endpoints
✅ Comprehensive error handling

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env is correct
- Ensure database exists: `createdb team_task_manager`

### Port Already in Use
- Change PORT in .env (default: 8080)
- Or kill the process using the port

### Migration Errors
- Check if database schema exists
- Run: `npm run db:migrate` to apply pending migrations

### Cors/API Errors
- Verify CLIENT_URL matches your frontend URL
- Check CORS configuration in server/index.js

## Deployment

### Railway (Recommended)
1. Push code to GitHub
2. Connect to Railway
3. Set environment variables (DATABASE_URL, JWT_SECRET)
4. Deploy automatically

See `railway.toml` for Railway configuration.

### Docker
```bash
docker build -t team-task-manager .
docker run -p 8080:8080 team-task-manager
```

## Security Notes

⚠️ **IMPORTANT for Production:**
- Generate a secure JWT_SECRET: `openssl rand -base64 32`
- Use HTTPS only
- Set NODE_ENV="production"
- Update database credentials
- Enable CORS properly with allowed origins
- Rotate JWT secrets periodically

## Support

For issues or questions, check:
1. `.env` configuration
2. Database connection
3. Application logs
4. Prisma schema documentation

## License

See LICENSE file for details
