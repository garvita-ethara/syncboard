-- CreateEnum for ProjectMemberRole
CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterTable: Update Task reporter relationship to CASCADE instead of RESTRICT
ALTER TABLE "Task" DROP CONSTRAINT "Task_reporterId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Convert ProjectMember role to enum type
ALTER TABLE "ProjectMember" ALTER COLUMN "role" TYPE "ProjectMemberRole" USING CASE 
  WHEN role = 'OWNER' THEN 'OWNER'::"ProjectMemberRole"
  ELSE 'MEMBER'::"ProjectMemberRole"
END;
ALTER TABLE "ProjectMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"ProjectMemberRole";
