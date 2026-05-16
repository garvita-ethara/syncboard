PRAGMA foreign_keys=OFF;

DROP INDEX IF EXISTS "User_role_idx";
DROP INDEX IF EXISTS "Project_ownerId_idx";
DROP INDEX IF EXISTS "Project_dueDate_idx";
DROP INDEX IF EXISTS "Task_assigneeId_idx";
DROP INDEX IF EXISTS "Task_reporterId_idx";

ALTER TABLE "Project" RENAME COLUMN "ownerId" TO "createdBy";
ALTER TABLE "Task" RENAME COLUMN "assigneeId" TO "assignedTo";
ALTER TABLE "Task" RENAME COLUMN "reporterId" TO "createdBy";
ALTER TABLE "ProjectMember" RENAME COLUMN "createdAt" TO "joinedAt";

UPDATE "ProjectMember"
SET "role" = 'ADMIN'
WHERE "role" = 'OWNER';

UPDATE "Project"
SET "status" = 'ACTIVE'
WHERE "status" NOT IN ('ACTIVE', 'COMPLETED', 'ARCHIVED');

UPDATE "Task"
SET "priority" = 'HIGH'
WHERE "priority" NOT IN ('LOW', 'MEDIUM', 'HIGH');

UPDATE "Task"
SET "status" = 'IN_PROGRESS'
WHERE "status" NOT IN ('TODO', 'IN_PROGRESS', 'DONE');

ALTER TABLE "Project" DROP COLUMN "dueDate";
ALTER TABLE "User" DROP COLUMN "role";

CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
CREATE INDEX "Task_assignedTo_idx" ON "Task"("assignedTo");
CREATE INDEX "Task_createdBy_idx" ON "Task"("createdBy");

PRAGMA foreign_keys=ON;
