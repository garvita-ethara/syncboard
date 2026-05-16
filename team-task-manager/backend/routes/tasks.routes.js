import express from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { idParamSchema, taskCommentCreateSchema, taskCreateSchema, taskUpdateSchema } from '../utils/validators.js';
import { assertAssigneeIsProjectMember, assertProjectAccess, assertTaskAccess, getTaskPermissionContext } from '../utils/access.js';

export const tasksRouter = express.Router();
tasksRouter.use(requireAuth);

function assertAdmin(req) {
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Admin access required');
  }
}

const userSelect = { id: true, name: true, email: true };

const taskInclude = {
  project: { select: { id: true, name: true, team: true, status: true } },
  assignee: { select: userSelect },
  creator: { select: userSelect }
};

async function syncProjectCompletionStatus(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, dueDate: true, status: true }
  });
  if (!project) return;

  const [totalTasks, pendingTasks] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: { not: 'COMPLETED' } } })
  ]);

  const allCompleted = totalTasks > 0 && pendingTasks === 0;
  const pastDue = Boolean(project.dueDate) && new Date(project.dueDate) < new Date();
  let nextStatus = project.status;

  if (allCompleted) {
    nextStatus = 'COMPLETED';
  } else if (pastDue) {
    nextStatus = 'ON_HOLD';
  } else if (project.status === 'COMPLETED') {
    nextStatus = 'IN_PROGRESS';
  }

  if (nextStatus !== project.status) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: nextStatus }
    });
  }
}

function buildTaskFilter(user, query) {
  const scope = String(query.scope || 'team');
  const baseVisibility = user.role === 'ADMIN'
    ? {}
    : (scope === 'mine'
      ? { assignedTo: user.id }
      : {
          OR: [
            { assignedTo: user.id },
            { project: { createdBy: user.id } },
            { project: { members: { some: { userId: user.id } } } }
          ]
        });
  const filters = [baseVisibility];

  if (query.search) {
    const q = String(query.search);
    filters.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } }
      ]
    });
  }

  if (query.projectId) filters.push({ projectId: String(query.projectId) });
  if (query.status) filters.push({ status: String(query.status) });
  if (query.assignedTo) filters.push({ assignedTo: String(query.assignedTo) });
  if (query.priority) filters.push({ priority: String(query.priority) });
  if (query.dueDate) {
    const start = new Date(`${String(query.dueDate)}T00:00:00.000Z`);
    const end = new Date(`${String(query.dueDate)}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      filters.push({ dueDate: { gte: start, lte: end } });
    }
  }
  if (query.overdue === 'true') {
    filters.push({
      dueDate: { lt: new Date() },
      status: { not: 'COMPLETED' }
    });
  }

  return filters.length === 1 ? filters[0] : { AND: filters };
}

function buildTaskOrder(sort) {
  switch (String(sort || 'newest')) {
    case 'due_date':
      return [{ dueDate: 'asc' }, { createdAt: 'desc' }];
    case 'priority':
      return [{ priority: 'desc' }, { createdAt: 'desc' }];
    case 'status':
      return [{ status: 'asc' }, { createdAt: 'desc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}

async function updateTaskHandler(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const { task: existing, canManage, canUpdateOwnStatus } = await getTaskPermissionContext(req.user, id);
  const previousProjectId = existing.projectId;
  const data = taskUpdateSchema.parse(req.body);
  const targetProjectId = data.projectId || existing.projectId;
  const requestedKeys = Object.keys(data);
  const statusOnlyUpdate = requestedKeys.length > 0 && requestedKeys.every((key) => key === 'status');

  if (req.user.role !== 'ADMIN' && !canManage) {
    if (!(canUpdateOwnStatus && statusOnlyUpdate)) {
      throw new ApiError(403, 'Members can only update the status of tasks assigned to them');
    }
  }

  if (data.projectId && data.projectId !== existing.projectId) {
    await assertProjectAccess(req.user, data.projectId, { manage: true });
  }

  if (data.assignedTo !== undefined) {
    if (req.user.role !== 'ADMIN' && !canManage) {
      throw new ApiError(403, 'Only admins or team leads can assign tasks');
    }
    await assertAssigneeIsProjectMember(targetProjectId, data.assignedTo);
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.estimatedTime !== undefined ? { estimatedTime: data.estimatedTime || null } : {}),
      ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo || null } : {})
    },
    include: taskInclude
  });

  await syncProjectCompletionStatus(task.projectId);
  if (previousProjectId !== task.projectId) {
    await syncProjectCompletionStatus(previousProjectId);
  }

  res.json({ task });
}

tasksRouter.get('/', asyncHandler(async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: buildTaskFilter(req.user, req.query),
    include: taskInclude,
    orderBy: buildTaskOrder(req.query.sort)
  });

  res.json({ tasks });
}));

tasksRouter.post('/', asyncHandler(async (req, res) => {
  const data = taskCreateSchema.parse(req.body);
  await assertProjectAccess(req.user, data.projectId, { manage: true });
  await assertAssigneeIsProjectMember(data.projectId, data.assignedTo);

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimatedTime: data.estimatedTime || null,
      projectId: data.projectId,
      assignedTo: data.assignedTo,
      createdBy: req.user.id
    },
    include: taskInclude
  });

  await syncProjectCompletionStatus(task.projectId);

  res.status(201).json({ task });
}));

tasksRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await assertTaskAccess(req.user, id);

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      comments: {
        include: { user: { select: userSelect } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ task });
}));

tasksRouter.get('/:id/comments', asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await assertTaskAccess(req.user, id);

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ comments });
}));

tasksRouter.post('/:id/comments', asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { canManage, canUpdateOwnStatus } = await getTaskPermissionContext(req.user, id);
  const data = taskCommentCreateSchema.parse(req.body);
  if (req.user.role !== 'ADMIN' && !canManage && !canUpdateOwnStatus) {
    throw new ApiError(403, 'You are not allowed to comment on this task');
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId: id,
      userId: req.user.id,
      message: data.message
    },
    include: { user: { select: userSelect } }
  });

  res.status(201).json({ comment });
}));

tasksRouter.put('/:id', asyncHandler(updateTaskHandler));
tasksRouter.patch('/:id', asyncHandler(updateTaskHandler));

tasksRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await assertTaskAccess(req.user, id, { manage: true });

  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true, projectId: true }
  });
  if (!existing) throw new ApiError(404, 'Task not found');

  await prisma.task.delete({ where: { id } });
  await syncProjectCompletionStatus(existing.projectId);
  res.status(204).send();
}));
