import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/http.js';

export async function canCreateProjects(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  if (user?.role === 'ADMIN') return true;

  const [projectCount, createdCount, adminMembership] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { createdBy: userId } }),
    prisma.projectMember.findFirst({
      where: { userId, role: 'ADMIN' },
      select: { id: true }
    })
  ]);

  if (projectCount === 0) {
    return true;
  }

  return createdCount > 0 || Boolean(adminMembership);
}

export function projectVisibilityWhere(user) {
  return {
    OR: [
      { createdBy: user.id },
      { members: { some: { userId: user.id } } }
    ]
  };
}

export function taskVisibilityWhere(user) {
  return {
    OR: [
      { assignedTo: user.id },
      { project: { createdBy: user.id } },
      { project: { members: { some: { userId: user.id } } } }
    ]
  };
}

export async function assertProjectAccess(user, projectId, { manage = false } = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId: user.id } } }
  });

  if (!project) throw new ApiError(404, 'Project not found');

  const membership = project.members[0] || null;
  const isCreator = project.createdBy === user.id;
  const isMember = Boolean(membership);
  const isProjectAdmin = membership?.role === 'ADMIN';

  if (manage && user.role !== 'ADMIN' && !isCreator && !isProjectAdmin) {
    throw new ApiError(403, 'Only the project creator or project admins can manage this project');
  }

  if (!isCreator && !isMember) {
    throw new ApiError(403, 'You do not have access to this project');
  }

  return true;
}

export async function assertTaskAccess(user, taskId, { manage = false } = {}) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          createdBy: true,
          members: { where: { userId: user.id } }
        }
      }
    }
  });

  if (!task) throw new ApiError(404, 'Task not found');

  const membership = task.project.members[0] || null;
  const isProjectCreator = task.project.createdBy === user.id;
  const isProjectAdmin = membership?.role === 'ADMIN';
  const isProjectMember = Boolean(membership);
  const isAssignee = task.assignedTo === user.id;

  if (manage && user.role !== 'ADMIN' && !isProjectCreator && !isProjectAdmin) {
    throw new ApiError(403, 'You cannot manage this task');
  }

  if (!isProjectCreator && !isProjectMember && !isAssignee) {
    throw new ApiError(403, 'You do not have access to this task');
  }

  return task;
}

export async function getTaskPermissionContext(user, taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          createdBy: true,
          members: { where: { userId: user.id } }
        }
      }
    }
  });

  if (!task) throw new ApiError(404, 'Task not found');

  const membership = task.project.members[0] || null;
  const isProjectCreator = task.project.createdBy === user.id;
  const isProjectAdmin = membership?.role === 'ADMIN';
  const canManage = isProjectCreator || isProjectAdmin;
  const canUpdateOwnStatus = task.assignedTo === user.id;
  const canView = canManage || Boolean(membership) || canUpdateOwnStatus;

  if (!canView) {
    throw new ApiError(403, 'You do not have access to this task');
  }

  return { task, membership, canManage, canUpdateOwnStatus };
}

export async function assertAssigneeIsProjectMember(projectId, assignedTo) {
  if (!assignedTo) return;

  const user = await prisma.user.findUnique({ where: { id: assignedTo } });
  if (!user) throw new ApiError(400, 'Assignee does not exist');

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assignedTo } }
  });

  if (!membership) {
    throw new ApiError(400, 'Assignee must be a project member');
  }
}
