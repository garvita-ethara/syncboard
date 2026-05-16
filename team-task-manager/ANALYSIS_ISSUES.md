# Team Task Manager - Comprehensive Issue Analysis

**Analysis Date:** May 14, 2026  
**Project:** Full-stack Team Task Manager (React + Node.js + Prisma)

---

## CRITICAL ISSUES (Will Break Application)

### 1. **Missing `project.ownerId` in Task Delete Permission Check**
- **File:** [server/routes/tasks.routes.js](server/routes/tasks.routes.js#L109)
- **Line:** 109
- **Severity:** 🔴 CRITICAL
- **Issue:** The taskInclude object (line 12-14) only selects `{ id: true, name: true, status: true }` for the project relationship. However, the delete endpoint at line 109 tries to access `task.project.ownerId`, which won't be included in the fetched task object.
- **Current Code:**
  ```javascript
  const taskInclude = {
    project: { select: { id: true, name: true, status: true } },
    assignee: { select: { id: true, name: true, email: true, role: true } },
    reporter: { select: { id: true, name: true, email: true, role: true } }
  };
  ```
  Later at line 109:
  ```javascript
  if (req.user.role !== 'ADMIN' && task.project.ownerId !== req.user.id && task.reporterId !== req.user.id)
  ```
- **Impact:** `task.project.ownerId` will be `undefined`, causing the permission check to fail. Project owners won't be able to delete their own project's tasks.
- **Fix:** Add `ownerId` to the project select statement:
  ```javascript
  const taskInclude = {
    project: { select: { id: true, name: true, status: true, ownerId: true } },
    assignee: { select: { id: true, name: true, email: true, role: true } },
    reporter: { select: { id: true, name: true, email: true, role: true } }
  };
  ```

---

### 2. **Incorrect CORS Configuration in Production**
- **File:** [server/index.js](server/index.js#L29)
- **Line:** 29
- **Severity:** 🔴 CRITICAL (Security Issue)
- **Issue:** CORS origin is set to `true` in production, which is not a valid CORS option. According to the CORS library documentation, `origin: true` is not a valid configuration. Setting this without proper origin validation exposes the API to CSRF attacks.
- **Current Code:**
  ```javascript
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? true : clientUrl,
    credentials: true
  }));
  ```
- **Impact:** CORS validation may fail or behave unexpectedly in production. The API's CORS protection won't work correctly.
- **Fix:** Use a proper origin configuration:
  ```javascript
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')
      : clientUrl,
    credentials: true
  }));
  ```
  Or require explicit `ALLOWED_ORIGINS` environment variable in production.

---

### 3. **Task Access Control Logic Error in `access.js`**
- **File:** [server/utils/access.js](server/utils/access.js#L59)
- **Line:** 59
- **Severity:** 🔴 CRITICAL
- **Issue:** The `assertTaskAccess` function tries to access `task.project.ownerId` at line 59, but similar to issue #1, when this function is called from tasks.routes.js with different include statements, the ownerId may not be present. Additionally, the logic for manage permissions at line 56 is overly restrictive:
  ```javascript
  if (manage && !isOwner && !isProjectMember && !isReporter) {
    throw new ApiError(403, 'You cannot manage this task');
  }
  ```
  This means task reporters cannot modify their own tasks, which might not be intended.
- **Fix:** Include ownerId in the project fetch and clarify the management permission logic:
  ```javascript
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: { where: { userId: user.id } } } } }
  });
  // ... rest of function
  const isOwner = task.project.ownerId === user.id;
  // ...
  if (manage && !isOwner && !isReporter) {
    throw new ApiError(403, 'You cannot manage this task');
  }
  ```

---

### 4. **Missing .env File and Environment Variables**
- **File:** Project root (missing)
- **Severity:** 🔴 CRITICAL
- **Issue:** The application requires multiple environment variables that are not documented or provided:
  - `DATABASE_URL` (required for Prisma connection)
  - `JWT_SECRET` (required for token signing, critical in production)
  - `NODE_ENV` (defaults to development)
  - `PORT` (defaults to 8080)
  - `CLIENT_URL` (defaults to http://localhost:5173)
  - `ADMIN_EMAIL` (for seed)
  - `ADMIN_PASSWORD` (for seed)
  - `ADMIN_NAME` (for seed)
  
  There is no `.env.example` file provided to guide users on required variables.
- **Fix:** Create `.env.example` file:
  ```
  DATABASE_URL=postgresql://user:password@localhost:5432/team_task_manager
  JWT_SECRET=your-super-secret-key-change-this-in-production
  NODE_ENV=development
  PORT=8080
  CLIENT_URL=http://localhost:5173
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=Admin123!
  ADMIN_NAME=Admin User
  ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
  ```

---

## HIGH PRIORITY ISSUES

### 5. **Incomplete Task Permission Check in Delete Route**
- **File:** [server/routes/tasks.routes.js](server/routes/tasks.routes.js#L106-L112)
- **Lines:** 106-112
- **Severity:** 🟠 HIGH
- **Issue:** The delete task endpoint checks permissions, but doesn't use the `assertTaskAccess` function which handles visibility. This means:
  1. The permission check references `task.project.ownerId` which isn't included
  2. The logic doesn't verify the user can see the task before deleting
- **Current Code:**
  ```javascript
  tasksRouter.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const task = await assertTaskAccess(req.user, id);
    // ... but then checks task.project.ownerId which may be undefined
    if (req.user.role !== 'ADMIN' && task.project.ownerId !== req.user.id && task.reporterId !== req.user.id) {
      throw new ApiError(403, 'Only admins, project owners, or task reporters can delete this task');
    }
  ```
- **Fix:** Ensure all required fields are included and logic is correct (depends on fixing issue #1 first).

---

### 6. **ProjectMember Role Not Properly Validated**
- **File:** [prisma/schema.prisma](prisma/schema.prisma#L65)
- **Line:** 65
- **Severity:** 🟠 HIGH
- **Issue:** The `ProjectMember.role` field is defined as a plain `String` instead of an enum:
  ```prisma
  role      String   @default("MEMBER")
  ```
  This is inconsistent with other status/role enums in the schema and allows any string value. While the code enforces specific values ("OWNER", "MEMBER"), the database schema doesn't enforce this constraint.
- **Impact:** Invalid role values can be inserted directly via database, causing application errors.
- **Fix:** Create a ProjectMemberRole enum in the schema:
  ```prisma
  enum ProjectMemberRole {
    OWNER
    MEMBER
  }
  
  model ProjectMember {
    // ...
    role ProjectMemberRole @default(MEMBER)
    // ...
  }
  ```
  Then create and run a migration.

---

### 7. **User Deletion Restriction Due to Task Reports**
- **File:** [prisma/schema.prisma](prisma/schema.prisma#L113)
- **Line:** 113
- **Severity:** 🟠 HIGH (Data Management Issue)
- **Issue:** Tasks have `onDelete: Restrict` for the reporter relationship:
  ```prisma
  reporter User    @relation("TaskReporter", fields: [reporterId], references: [id], onDelete: Restrict)
  ```
  This means you cannot delete any user who has reported tasks. In a production system with long task histories, this can make user management impossible.
- **Impact:** Users cannot be deleted if they've ever reported a task, even if they're no longer active.
- **Recommendation:** Consider using `onDelete: SetNull` or `Cascade` instead. Alternatively, implement soft deletes for users.

---

### 8. **Inconsistent Include/Select Patterns in Projects Routes**
- **File:** [server/routes/projects.routes.js](server/routes/projects.routes.js#L12-L16)
- **Lines:** 12-16
- **Severity:** 🟠 HIGH
- **Issue:** The `projectInclude` object includes nested relations with `select` statements that limit fields, but doesn't include important fields like project status in all queries. This could cause data inconsistencies.
- **Pattern:**
  ```javascript
  const projectInclude = {
    owner: { select: { id: true, name: true, email: true, role: true } },
    members: { /* ... */ },
    _count: { select: { tasks: true, members: true } }
  };
  ```
  Later in ProjectDetail fetch at line 49-62, tasks are included but with a different structure.
- **Impact:** Inconsistent data structure between list and detail views.

---

## MEDIUM PRIORITY ISSUES

### 9. **Missing Error Message in `errorHandler` for Uncaught Errors**
- **File:** [server/middleware/errorHandler.js](server/middleware/errorHandler.js#L22-24)
- **Lines:** 22-24
- **Severity:** 🟡 MEDIUM
- **Issue:** Generic error response doesn't distinguish between different error types well. Prisma errors like P2002 (unique constraint), P2025 (record not found) are handled, but other Prisma error codes aren't, which could leak internal error details.
- **Current Code:**
  ```javascript
  console.error(error);
  return res.status(500).json({ message: 'Unexpected server error' });
  ```
- **Recommendation:** Implement more comprehensive Prisma error handling or use a middleware error mapping utility.

---

### 10. **No Input Sanitization for User-Provided Text Fields**
- **File:** [server/utils/validators.js](server/utils/validators.js)
- **Severity:** 🟡 MEDIUM (Security)
- **Issue:** Text fields like `description`, `title` are trimmed but not sanitized against XSS or HTML injection. While React should escape content, storing unsanitized HTML could be a risk if the API is used by other clients.
- **Recommendation:** Consider using a library like `xss` to sanitize user input, especially for `description` and other text fields.

---

### 11. **No Rate Limiting on Authentication Endpoints**
- **File:** [server/routes/auth.routes.js](server/routes/auth.routes.js)
- **Severity:** 🟡 MEDIUM (Security)
- **Issue:** Rate limiting is applied to all `/api` routes (line 38 in index.js: 600 requests per 15 minutes), but this is a global limit. Login/signup endpoints should have stricter, separate rate limiting to prevent brute force attacks.
- **Recommendation:** Apply additional rate limiting middleware specifically to auth routes:
  ```javascript
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10, // Much stricter
    skipSuccessfulRequests: true,
    message: 'Too many login attempts, please try again later'
  });
  
  authRouter.post('/login', authLimiter, asyncHandler(async (req, res) => { ... }));
  authRouter.post('/signup', authLimiter, asyncHandler(async (req, res) => { ... }));
  ```

---

### 12. **Missing Token Refresh Mechanism**
- **File:** [server/lib/auth.js](server/lib/auth.js#L11)
- **Line:** 11
- **Severity:** 🟡 MEDIUM
- **Issue:** JWT tokens are set to expire in 7 days (`expiresIn: '7d'`), but there's no refresh token mechanism. Users will be logged out after 7 days with no way to refresh without re-authenticating.
- **Recommendation:** Implement a refresh token endpoint or extend token expiration with a shorter-lived access token.

---

### 13. **No Logging for Audit Trail**
- **File:** Entire Backend
- **Severity:** 🟡 MEDIUM (Operations)
- **Issue:** No comprehensive logging for:
  - User actions (task creation, deletion, updates)
  - Admin actions (user role changes)
  - Security events (failed login attempts, permission denials)
  
  Only `morgan` middleware logs HTTP requests, but not business logic events.
- **Recommendation:** Implement a proper logging system (e.g., Winston, Pino) with audit trail for compliance.

---

### 14. **Vite Build Path Configuration**
- **File:** [vite.config.js](vite.config.js#L5)
- **Line:** 5
- **Severity:** 🟡 MEDIUM (Build Issue)
- **Issue:** The build output directory is set to `../dist/public`, which requires careful path management. If the project structure changes, this could break the build.
- **Current Code:**
  ```javascript
  build: {
    outDir: '../dist/public',
    emptyOutDir: true
  }
  ```
- **Impact:** Build output structure is fragile. Also, the express.static serves from this directory, and SPA fallback might not work correctly.

---

### 15. **No HTTPS Enforcement in Production**
- **File:** [server/index.js](server/index.js)
- **Severity:** 🟡 MEDIUM (Security)
- **Issue:** No middleware to enforce HTTPS in production. While Railway might handle this, the application itself doesn't redirect HTTP to HTTPS or set HSTS headers.
- **Recommendation:** Add HTTPS enforcement:
  ```javascript
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }
  ```

---

## LOW PRIORITY ISSUES

### 16. **No Pagination in API Endpoints**
- **Files:** Multiple routes
- **Severity:** 🟢 LOW (Scalability)
- **Issue:** All list endpoints (projects, tasks, users) return all records without pagination. In a large deployment, this could cause performance issues and excessive data transfer.
- **Example:** [server/routes/projects.routes.js](server/routes/projects.routes.js#L18-L23)
- **Recommendation:** Implement pagination with `skip` and `take` parameters.

---

### 17. **No Validation for Maximum List Size**
- **File:** [server/routes/dashboard.routes.js](server/routes/dashboard.routes.js#L20)
- **Line:** 20
- **Severity:** 🟢 LOW (Scalability)
- **Issue:** Dashboard loads up to 8 upcoming tasks (line 20: `take: 8`), but other queries don't have limits. Consider implementing reasonable defaults.

---

### 18. **Missing Content-Type Validation**
- **File:** [server/index.js](server/index.js#L35)
- **Line:** 35
- **Severity:** 🟢 LOW
- **Issue:** `express.json()` accepts requests but doesn't validate Content-Type header. While express.json() has a `type` option, it's not explicitly configured.
- **Recommendation:** Add stricter Content-Type validation.

---

### 19. **No Database Connection Timeout Handling**
- **File:** [server/lib/prisma.js](server/lib/prisma.js)
- **Severity:** 🟢 LOW (Reliability)
- **Issue:** Prisma client is created without timeout or reconnection configuration. In case of database disconnection, the server might hang.
- **Recommendation:** Configure Prisma with connection pool settings:
  ```javascript
  export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty'
  });
  ```

---

### 20. **Inconsistent Error Response Format**
- **File:** [server/middleware/errorHandler.js](server/middleware/errorHandler.js)
- **Severity:** 🟢 LOW
- **Issue:** Different error types return different response structures:
  - ZodError returns `{ message, details }`
  - ApiError returns `{ message, details }`
  - Prisma errors return only `{ message }`
  - Generic errors return only `{ message }`
- **Recommendation:** Standardize error response format.

---

### 21. **Missing Database Indexes for Common Queries**
- **File:** [prisma/schema.prisma](prisma/schema.prisma)
- **Severity:** 🟢 LOW (Performance)
- **Issue:** While indexes exist for common lookups, there's no index on `ProjectMember.userId` alone, which is queried frequently. The composite unique constraint provides an index, but explicit indexes improve query planner decisions.
- **Current Indexes:** ✓ User.role, Project.ownerId, Project.status, Project.dueDate, ProjectMember.userId, Task.projectId, Task.assigneeId, Task.reporterId, Task.status, Task.dueDate
- **Missing:** Could benefit from an index on Task.reporterId alone for finding all tasks reported by a user.

---

### 22. **No Validation of Role Values in ProjectMember**
- **File:** [server/routes/projects.routes.js](server/routes/projects.routes.js#L108)
- **Line:** 108
- **Severity:** 🟢 LOW
- **Issue:** While `addMemberSchema` validates the role field, there's no enum constraint in the schema. Invalid roles could theoretically be set through direct database access.

---

### 23. **Client-Side: Missing Error Boundary**
- **File:** [client/src/main.jsx](client/src/main.jsx)
- **Severity:** 🟢 LOW (User Experience)
- **Issue:** React component has no error boundary to handle component rendering errors. If any component throws an error, the entire app crashes.
- **Recommendation:** Add an Error Boundary component.

---

### 24. **Client-Side: No Loading State for API Calls**
- **File:** [client/src/main.jsx](client/src/main.jsx)
- **Severity:** 🟢 LOW (UX)
- **Issue:** Some components show "Loading..." text, but others just show nothing while fetching. Inconsistent loading states across the app.
- **Components affected:** Dashboard, Projects, Tasks, Team

---

### 25. **README.md Not Provided for Review**
- **File:** README.md (not read)
- **Severity:** 🟢 LOW (Documentation)
- **Note:** README exists but wasn't analyzed. Should include:
  - Setup instructions
  - Environment variables
  - Development commands
  - Deployment notes
  - Known limitations

---

## SUMMARY TABLE

| Category | Count | Severity |
|----------|-------|----------|
| Critical Issues | 4 | 🔴 Will break the app |
| High Priority | 4 | 🟠 Should fix before production |
| Medium Priority | 7 | 🟡 Should fix soon |
| Low Priority | 10 | 🟢 Nice to have fixes |
| **Total** | **25** | |

---

## RECOMMENDED FIX PRIORITY

1. ✅ **First:** Fix Issue #1 (taskInclude missing ownerId) - breaks delete permissions
2. ✅ **Second:** Fix Issue #2 (CORS production config) - security issue
3. ✅ **Third:** Fix Issue #3 (access.js permission logic) - access control
4. ✅ **Fourth:** Add Issue #4 (.env setup) - required to run app
5. ✅ **Fifth:** Fix Issue #6 (ProjectMember role enum) - data integrity
6. ⏳ **Then:** Address medium and low priority issues

---

## TESTING RECOMMENDATIONS

After fixes, test:
- [ ] Project owner can delete tasks in their project
- [ ] Non-members cannot access tasks
- [ ] CORS works correctly in both dev and production
- [ ] Role changes in ProjectMembers work correctly
- [ ] User deletion fails gracefully with helpful error
- [ ] Authentication rate limiting works
- [ ] Token expiration handling works
- [ ] Database connection failures don't hang the server
- [ ] Error responses are consistent

