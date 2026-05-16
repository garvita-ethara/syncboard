# Team Task Manager - Codebase Analysis

## 1. Authentication & User Role System

### Role Types
The system implements a **two-tier role hierarchy**:
- **ADMIN**: Full system access; can create projects, manage all teams; first registered user automatically becomes ADMIN
- **MEMBER**: Standard users; can be assigned to projects and tasks

**Source**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L4-L6)

### User Model Structure
```
User {
  id           String          // CUID identifier
  name         String
  email        String          // Unique
  passwordHash String          // bcryptjs hash with 12 rounds
  role         String          // ADMIN | MEMBER
  createdAt    DateTime        // Auto-set
  updatedAt    DateTime        // Auto-update
  
  // Relations
  ownedProjects Project[]       // Projects owned by user
  memberships   ProjectMember[] // Project membership entries
  assignedTasks Task[]          // Tasks assigned to user
  reportedTasks Task[]          // Tasks created/reported by user
  
  @@index([role])              // Index for role filtering
}
```

**Source**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L8-L25)

### Authentication Flow

1. **Signup** ([backend/routes/auth.routes.js](backend/routes/auth.routes.js#L10-L27)):
   - Validates email uniqueness
   - First user in system automatically becomes ADMIN; subsequent users are MEMBER
   - Password hashed with bcryptjs (12 rounds)
   - Returns JWT token + sanitized user object

2. **Login** ([backend/routes/auth.routes.js](backend/routes/auth.routes.js#L29-L40)):
   - Email + password validation
   - Returns JWT token + user data if successful
   - Throws 401 on invalid credentials

3. **Token Structure** ([backend/lib/auth.js](backend/lib/auth.js#L7-L14)):
   ```javascript
   JWT Claims: {
     sub: user.id,           // Subject (user ID)
     role: user.role,        // User role
     email: user.email,
     expiresIn: '7d'        // 7-day expiration
   }
   Secret: process.env.JWT_SECRET (or 'development-only-secret-change-me' in dev)
   ```

4. **Protected Route Middleware** ([backend/middleware/auth.js](backend/middleware/auth.js)):
   - Extracts Bearer token from Authorization header
   - Verifies JWT signature
   - Loads user from database
   - Attaches user object to `req.user`
   - Returns 401 if token invalid or user not found

5. **Admin-Only Routes** ([backend/middleware/auth.js](backend/middleware/auth.js#L24-L28)):
   - `requireAdmin()` middleware restricts to `req.user.role === 'ADMIN'`
   - Returns 403 Forbidden otherwise

### Frontend Authentication Context
**File**: [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)

**State Management**:
- `token`: JWT stored in localStorage (key: `ttm_token`)
- `user`: Current authenticated user object
- `booting`: Loading state during app initialization

**Key Functions**:
- `authenticate(mode, form)`: Calls `/auth/login` or `/auth/signup`
  - Stores token in localStorage
  - Updates local state
- `logout()`: Clears token and user state
- `loadMe()`: Fetches current user from `/auth/me` endpoint during app boot
- `reloadUser()`: Refresh user data (exposed as public function)

**Usage**: `const { token, user, booting, authenticate, logout } = useAuth()`

---

## 2. Prisma Schema & Data Model

**File**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

### Database: SQLite

### Core Models

#### User Model
- Stores authentication and user profile
- Role-based access control via `role` field
- Indexed by role for efficient filtering

#### Project Model
```
Project {
  id          String        // CUID
  name        String        // Project name
  description String?       // Optional description
  status      String        // PLANNED | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED
  dueDate     DateTime?     // Optional deadline
  ownerId     String        // FK to User
  createdAt   DateTime
  updatedAt   DateTime

  // Relations
  owner       User          // Project owner (ADMIN who created it)
  members     ProjectMember[] // Team members on this project
  tasks       Task[]        // Tasks in this project
  
  @@index([ownerId])
  @@index([status])
  @@index([dueDate])
}
```

#### ProjectMember Model (Join Table)
```
ProjectMember {
  id        String        // CUID
  projectId String        // FK to Project
  userId    String        // FK to User
  role      String        // OWNER | MEMBER
  createdAt DateTime
  
  project   Project       // Reference to project
  user      User          // Reference to user
  
  @@unique([projectId, userId])  // One membership per user per project
  @@index([userId])
}
```

- Enables many-to-many relationship between Users and Projects
- Each member has a role within the project (OWNER or MEMBER)
- Cascade delete on project deletion
- Cascade delete on user deletion

#### Task Model
```
Task {
  id          String       // CUID
  title       String       // Task title
  description String?      // Optional details
  status      String       // TODO | IN_PROGRESS | REVIEW | DONE | BLOCKED
  priority    String       // LOW | MEDIUM | HIGH | URGENT
  dueDate     DateTime?    // Optional deadline
  projectId   String       // FK to Project
  assigneeId  String?      // FK to User (optional - can be unassigned)
  reporterId  String       // FK to User (who created the task)
  createdAt   DateTime
  updatedAt   DateTime

  // Relations
  project     Project      // Parent project
  assignee    User?        // Assigned team member
  reporter    User         // Task creator
  
  @@index([projectId])
  @@index([assigneeId])
  @@index([reporterId])
  @@index([status])
  @@index([dueDate])
}
```

- Soft relationships: assignee set to NULL if user deleted (SetNull)
- Hard cascade: deletes with project or reporter
- Rich filtering via status, priority, dueDate indexes

---

## 3. Access Control System

**File**: [backend/utils/access.js](backend/utils/access.js)

### Visibility Rules

#### `projectVisibilityWhere(user)`
Determines which projects a user can see:
- **ADMIN**: Sees ALL projects
- **Non-Admin**: Sees only projects where they are:
  - Owner (`ownerId = user.id`)
  - Team member (entry in ProjectMember table)

#### `taskVisibilityWhere(user)`
Determines which tasks a user can see:
- **ADMIN**: Sees ALL tasks
- **Non-Admin**: Sees tasks where they are:
  - Assigned (`assigneeId = user.id`)
  - Reporter (`reporterId = user.id`)
  - Project owner
  - Project team member

### Permission Checks

#### `assertProjectAccess(user, projectId, { manage = false })`
- **Read Access**: User is ADMIN, owner, or project member
- **Manage Access** (manage=true): User is ADMIN or project owner (required for updates/deletions)
- Throws 403 if insufficient permissions
- Throws 404 if project not found

#### `assertTaskAccess(user, taskId, { manage = false })`
- **Read Access**: User is ADMIN, assignee, reporter, project owner, or project member
- **Manage Access** (manage=true): User is ADMIN, project owner, project member, or task reporter
- Throws 403 if insufficient permissions
- Throws 404 if task not found

#### `assertAssigneeIsProjectMember(projectId, assigneeId)`
- Ensures task assignee is either ADMIN or a project member
- Prevents assigning tasks to non-members
- Throws 400 if assignee not valid

---

## 4. API Endpoints

### Authentication Routes
**File**: [backend/routes/auth.routes.js](backend/routes/auth.routes.js)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/signup` | POST | ❌ | Register new user; first user → ADMIN |
| `/auth/login` | POST | ❌ | Authenticate user; returns token + user |
| `/auth/me` | GET | ✅ | Get current authenticated user |

**Request/Response Examples**:
```javascript
// POST /auth/signup
Request:  { name: string, email: string, password: string (8+ chars) }
Response: { token: string, user: User }

// POST /auth/login
Request:  { email: string, password: string }
Response: { token: string, user: User }

// GET /auth/me
Response: { user: User }
```

### Projects Routes
**File**: [backend/routes/projects.routes.js](backend/routes/projects.routes.js)

| Endpoint | Method | Auth | Requirement | Description |
|----------|--------|------|-------------|-------------|
| `/projects` | GET | ✅ | None | List user's accessible projects |
| `/projects` | POST | ✅ | ADMIN role | Create new project |
| `/projects/:id` | GET | ✅ | Access | Get project with all tasks |
| `/projects/:id` | PATCH | ✅ | Owner/Admin | Update project details |
| `/projects/:id` | DELETE | ✅ | Owner/Admin | Delete project |
| `/projects/:id/members` | POST | ✅ | Owner/Admin | Add/update project member |
| `/projects/:id/members/:userId` | DELETE | ✅ | Owner/Admin | Remove project member |

**Key Response Structure**:
```javascript
// Project include: owner, members, task count, member count
Project {
  id, name, description, status, dueDate,
  owner: { id, name, email, role },
  members: [{ user: {...}, role, createdAt }],
  _count: { tasks, members },
  tasks: [{ id, title, assignee, reporter, ... }] // Only in GET /:id
}
```

**Constraints**:
- Only ADMIN can create projects
- Non-owners can only view; cannot modify
- Project owner cannot be removed from membership
- Assignees must be project members

### Tasks Routes
**File**: [backend/routes/tasks.routes.js](backend/routes/tasks.routes.js)

| Endpoint | Method | Auth | Requirement | Description |
|----------|--------|------|-------------|-------------|
| `/tasks` | GET | ✅ | None | List user's accessible tasks (with filtering) |
| `/tasks` | POST | ✅ | Project access | Create task in project |
| `/tasks/:id` | GET | ✅ | Access | Get task details |
| `/tasks/:id` | PATCH | ✅ | Manage rights | Update task |
| `/tasks/:id` | DELETE | ✅ | Manage rights | Delete task |

**Query Filters** (GET /tasks):
```
?projectId=xxx        // Filter by project
?status=TODO          // Filter by status (TODO|IN_PROGRESS|REVIEW|DONE|BLOCKED)
?assigneeId=xxx       // Filter by assignee
?priority=HIGH        // Filter by priority (LOW|MEDIUM|HIGH|URGENT)
?overdue=true         // Show only overdue, incomplete tasks
```

**Task Response Structure**:
```javascript
Task {
  id, title, description, status, priority, dueDate,
  projectId, assigneeId, reporterId,
  project: { id, name, status },
  assignee: { id, name, email, role } | null,
  reporter: { id, name, email, role },
  createdAt, updatedAt
}
```

**Task Constraints**:
- Only project members can be assigned tasks
- Reporter is auto-set to current user
- Assignee is optional (can be null)
- Only ADMIN, project owner, project members, or reporter can modify

### Dashboard Route
**File**: [backend/routes/dashboard.routes.js](backend/routes/dashboard.routes.js)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/dashboard` | GET | ✅ | Get dashboard metrics and upcoming tasks |

**Response Structure**:
```javascript
{
  summary: {
    projectCount: number,
    totalTasks: number,
    myTasks: number,          // Tasks assigned to user
    overdueTasks: number,     // Incomplete, past due date
    completedTasks: number,
    progress: number          // Percentage (0-100)
  },
  status: {                    // Count by status
    TODO: number,
    IN_PROGRESS: number,
    REVIEW: number,
    DONE: number,
    BLOCKED: number
  },
  priority: {                  // Count by priority (not in UI yet)
    LOW: number,
    MEDIUM: number,
    HIGH: number,
    URGENT: number
  },
  upcomingTasks: [             // Next 8 due tasks, ordered by dueDate
    { id, title, dueDate, status, projectId, assigneeId, ... }
  ]
}
```

---

## 5. Frontend Implementation

### Frontend Folder Structure
```
frontend/src/
├── App.jsx                 // Root component
├── main.jsx               // Entry point
├── constants.js           // API_BASE, TOKEN_KEY, status/priority options
├── styles.css             // Global styles
├── components/            // Reusable UI components
│   ├── AuthScreen.jsx     // Login/signup form
│   ├── Modal.jsx          // Generic modal dialog
│   ├── PageHeader.jsx     // Page title + description
│   ├── Stat.jsx           // Dashboard stat card
│   └── TaskTable.jsx      // Reusable task listing
├── context/
│   └── AuthContext.jsx    // Global authentication state
├── features/              // Page-level components
│   ├── Dashboard.jsx      // Dashboard/home page
│   ├── Projects.jsx       // Projects list
│   ├── ProjectDetail.jsx  // Project detail view
│   ├── Tasks.jsx          // Tasks list
│   └── Team.jsx           // Team management
├── hooks/
│   └── useApi.js          // API wrapper hook
├── services/
│   └── api.js             // Low-level API client
└── utils/
    └── dateUtils.js       // Date formatting utilities
```

### Authentication Context
**File**: [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)

**Provides**:
```javascript
{
  token: string | null,                    // JWT token
  user: User | null,                       // Current user
  booting: boolean,                        // App initialization
  authenticate: (mode, form) => Promise,   // Login/signup
  logout: () => void,                      // Logout
  reloadUser: () => Promise                // Refresh user data
}
```

**Initialization**:
- On mount, loads token from localStorage
- Calls `/auth/me` to validate and restore user session
- Sets `booting=false` when complete
- Clears state if token invalid

### API Service
**File**: [frontend/src/services/api.js](frontend/src/services/api.js)

```javascript
apiRequest(path, { token?, method = 'GET', body? })
```

- Low-level fetch wrapper
- Adds `Authorization: Bearer {token}` header if provided
- Parses JSON response
- Throws on non-2xx status
- Handles 204 No Content responses

### API Hook
**File**: [frontend/src/hooks/useApi.js](frontend/src/hooks/useApi.js)

Convenience wrapper around `apiRequest`:
```javascript
const api = useApi();
api.get(path)           // GET
api.post(path, body)    // POST
api.patch(path, body)   // PATCH
api.delete(path)        // DELETE
```

Automatically includes token from auth context.

### Dashboard Feature
**File**: [frontend/src/features/Dashboard.jsx](frontend/src/features/Dashboard.jsx)

**Display Components**:
1. **Stats Grid**: Projects, total tasks, my tasks, overdue count
2. **Completion Progress**: Bar showing % complete (completed / total)
3. **Status Breakdown**: Horizontal bars showing task count per status
4. **Upcoming & Overdue**: Table of next 8 tasks ordered by due date

**Data Flow**:
```
Dashboard.jsx
  ↓
useApi().get('/dashboard')
  ↓
AuthContext (token from useAuth)
  ↓
api.js (apiRequest with Bearer token)
  ↓
Backend /dashboard endpoint
```

**State Management**:
- `data`: Dashboard metrics fetched from API
- `error`: Error message if fetch fails
- Loading state while `data === null`

### Authentication Screen
**File**: [frontend/src/components/AuthScreen.jsx](frontend/src/components/AuthScreen.jsx)

**Modes**: Login / Signup
- **Signup**: name, email, password fields
- **Login**: email, password fields
- Password minimum 8 characters
- Toggle between modes

**User Hint**:
```
"First registered user automatically becomes Admin.
Seeded deployments can use the README admin credentials."
```

---

## 6. Key Data Flows

### User Registration → ADMIN Role
1. User submits signup form (name, email, password)
2. Frontend calls `/auth/signup`
3. Backend checks `prisma.user.count()`
4. If count = 0 → role = 'ADMIN', else role = 'MEMBER'
5. Password hashed with bcryptjs (12 rounds)
6. User created in database
7. JWT token generated (7-day expiration)
8. Token stored in localStorage
9. AuthContext updates user state
10. User redirected to dashboard

### Task Assignment Flow
1. Admin creates project
2. Admin adds users as project members (via `/projects/:id/members`)
3. Admin creates task in project (via `/tasks` POST)
   - Must specify `assigneeId` that belongs to project members
   - `assertAssigneeIsProjectMember()` validates
4. Backend creates task with:
   - `reporterId` = current user (admin)
   - `assigneeId` = specified member
5. Task becomes visible to:
   - Assignee
   - Project members
   - Project owner
   - ADMIN

### Dashboard Data Aggregation
1. Frontend calls `/dashboard` on mount
2. Backend calculates (parallel):
   - Project count (filtered by visibility)
   - Total task count (filtered by visibility)
   - My tasks count (where assigneeId = user.id)
   - Overdue count (dueDate < now, status != DONE)
   - Task status breakdown (groupBy status)
   - Task priority breakdown (groupBy priority)
   - Upcoming 8 tasks (ordered by dueDate, not DONE)
3. Returns aggregated summary + task list
4. Frontend renders stats + charts

---

## 7. Constants & Enums

**File**: [frontend/src/constants.js](frontend/src/constants.js)

```javascript
API_BASE = '/api'
TOKEN_KEY = 'ttm_token'

statusOptions = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']
priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
projectStatusOptions = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']
```

---

## 8. Validation & Schemas

**File**: [backend/utils/validators.js](backend/utils/validators.js)

Uses Zod for runtime validation:

- **signupSchema**: name (2-80 chars), email (lowercase), password (8+ chars)
- **loginSchema**: email, password (1+ chars)
- **projectCreateSchema**: name (2-120 chars), description, status enum, dueDate
- **projectUpdateSchema**: partial, requires at least 1 field
- **taskCreateSchema**: title, description, status enum, priority enum, dueDate, projectId, assigneeId
- **taskUpdateSchema**: partial, requires at least 1 field
- **addMemberSchema**: email, role (OWNER|MEMBER, default MEMBER)

---

## 9. Summary of Role-Based Access

| Operation | ADMIN | Non-Admin Owner | Non-Admin Member | Non-Member |
|-----------|-------|-----------------|------------------|-----------|
| Create project | ✅ | ❌ | ❌ | ❌ |
| View project | ✅ | ✅ | ✅ | ❌ |
| Edit project | ✅ | ✅ | ❌ | ❌ |
| Delete project | ✅ | ✅ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |
| Create task | ✅ | ✅ | ✅ | ❌ |
| View task | ✅ | ✅ | ✅ | Conditional* |
| Edit task | ✅ | ✅ | ✅** | ❌ |
| Delete task | ✅ | ✅ | ✅** | ❌ |

**Conditional*: Non-members can view if they're assignee or reporter
**✅**: Members who are assignee or reporter can edit/delete

---

## 10. Database Indexing Strategy

All key filtering fields are indexed for performance:
- User: role
- Project: ownerId, status, dueDate
- ProjectMember: userId
- Task: projectId, assigneeId, reporterId, status, dueDate
- Composite unique constraint: ProjectMember(projectId, userId)

