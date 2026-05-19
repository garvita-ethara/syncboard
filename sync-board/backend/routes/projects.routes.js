import express from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { addMemberSchema, idParamSchema, projectCreateSchema, projectMemberRoleSchema, projectUpdateSchema } from '../utils/validators.js';
import { assertProjectAccess, projectVisibilityWhere } from '../utils/access.js';

export const projectsRouter = express.Router();
projectsRouter.use(requireAuth);

function assertAdmin(req) {
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Admin access required');
  }
}

const userSelect = { id: true, name: true, email: true };

const projectInclude = {
  creator: { select: userSelect },
  members: {
    include: { user: { select: userSelect } },
    orderBy: { joinedAt: 'asc' }
  },
  _count: { select: { tasks: true, members: true } }
};

function buildProjectListWhere(query) {
  const filters = [];
  if (query.search) {
    const q = String(query.search);
    filters.push({
      OR: [
        { name: { contains: q } },
        { description: { contains: q } }
      ]
    });
  }
  if (query.status) filters.push({ status: String(query.status) });
  if (query.priority) filters.push({ priority: String(query.priority) });
  if (query.assignedTo) {
    filters.push({ members: { some: { userId: String(query.assignedTo) } } });
  }
  if (query.dateFrom || query.dateTo) {
    const dueDate = {};
    if (query.dateFrom) {
      const from = new Date(`${String(query.dateFrom)}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) dueDate.gte = from;
    }
    if (query.dateTo) {
      const to = new Date(`${String(query.dateTo)}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) dueDate.lte = to;
    }
    if (Object.keys(dueDate).length) filters.push({ dueDate });
  }
  return filters.length ? { AND: filters } : {};
}

function buildProjectOrder(sort) {
  switch (String(sort || 'newest')) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'due_date':
      return [{ dueDate: 'asc' }, { createdAt: 'desc' }];
    case 'priority':
      return [{ priority: 'desc' }, { createdAt: 'desc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}

function withProgress(project) {
  const completedTasks = project.tasks.filter((task) => task.status === 'COMPLETED').length;
  const totalTasks = project.tasks.length;
  const isComplete = totalTasks > 0 && completedTasks === totalTasks;
  const isOverdue = Boolean(project.dueDate) && new Date(project.dueDate) < new Date() && !isComplete;

  return {
    ...project,
    progressPercentage: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    riskStatus: isOverdue ? 'OVERDUE' : 'ON_TRACK'
  };
}

async function resolveProjectMember(projectId, memberIdentifier) {
  const member = await prisma.projectMember.findFirst({
    where: {
      projectId,
      OR: [
        { id: memberIdentifier },
        { userId: memberIdentifier }
      ]
    },
    include: { user: { select: userSelect } }
  });

  if (!member) throw new ApiError(404, 'Project member not found');
  return member;
}

async function listProjectMembers(projectId) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: userSelect } },
    orderBy: { joinedAt: 'asc' }
  });
}

async function createProjectHandler(req, res) {
  assertAdmin(req);

  const data = projectCreateSchema.parse(req.body);
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description || null,
      team: data.team,
      status: data.status || 'NOT_STARTED',
      priority: data.priority || 'MEDIUM',
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdBy: req.user.id,
      members: { create: { userId: req.user.id, role: 'ADMIN' } }
    },
    include: projectInclude
  });

  res.status(201).json({ project });
}

async function updateProjectHandler(req, res) {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  await assertProjectAccess(req.user, id);
  const data = projectUpdateSchema.parse(req.body);
  if (data.status === 'COMPLETED') {
    const pendingCount = await prisma.task.count({
      where: {
        projectId: id,
        status: { not: 'COMPLETED' }
      }
    });
    if (pendingCount > 0) {
      throw new ApiError(400, 'Project can be marked completed only when all tasks are completed');
    }
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.team !== undefined ? { team: data.team } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {})
    },
    include: projectInclude
  });

  res.json({ project });
}

async function updateProjectMemberHandler(req, res) {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  const { memberId } = req.params;
  await assertProjectAccess(req.user, id);
  const data = projectMemberRoleSchema.parse(req.body);

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true }
  });

  if (!project) throw new ApiError(404, 'Project not found');

  const membership = await resolveProjectMember(id, memberId);
  if (project.createdBy === membership.userId) {
    throw new ApiError(400, 'Project creator must remain an Admin');
  }

  if (membership.role === 'ADMIN' && data.role !== 'ADMIN') {
    const adminCount = project.members.filter((member) => member.role === 'ADMIN').length;
    if (adminCount <= 1) {
      throw new ApiError(400, 'A project must always have at least one Admin');
    }
  }

  const member = await prisma.projectMember.update({
    where: { projectId_userId: { projectId: id, userId: membership.userId } },
    data: { role: data.role },
    include: { user: { select: userSelect } }
  });

  res.json({ member });
}

async function deleteProjectMemberHandler(req, res) {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  const { memberId } = req.params;
  await assertProjectAccess(req.user, id);

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true }
  });
  if (!project) throw new ApiError(404, 'Project not found');

  const membership = await resolveProjectMember(id, memberId);
  if (project.createdBy === membership.userId) {
    throw new ApiError(400, 'Project creator cannot be removed from the project');
  }

  if (membership.role === 'ADMIN') {
    const adminCount = project.members.filter((member) => member.role === 'ADMIN').length;
    if (adminCount <= 1) {
      throw new ApiError(400, 'A project must always have at least one Admin');
    }
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: id, userId: membership.userId } }
  });
  res.status(204).send();
}

projectsRouter.get('/', asyncHandler(async (req, res) => {
  const visibility = projectVisibilityWhere(req.user);
  const projects = await prisma.project.findMany({
    where: {
      AND: [
        visibility,
        buildProjectListWhere(req.query)
      ]
    },
    include: {
      ...projectInclude,
      tasks: { select: { status: true } }
    },
    orderBy: buildProjectOrder(req.query.sort)
  });

  const createAllowed = req.user.role === 'ADMIN';

  res.json({
    createAllowed,
    projects: projects.map(withProgress).sort((a, b) => {
      if (String(req.query.sort) === 'progress') return (b.progressPercentage || 0) - (a.progressPercentage || 0);
      return 0;
    })
  });
}));

projectsRouter.post('/', asyncHandler(createProjectHandler));

projectsRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await assertProjectAccess(req.user, id);

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      ...projectInclude,
      tasks: {
        include: {
          assignee: { select: userSelect },
          creator: { select: userSelect }
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }]
      }
    }
  });

  if (!project) throw new ApiError(404, 'Project not found');
  const completed = project.tasks.filter((task) => task.status === 'COMPLETED').length;
  const total = project.tasks.length;
  const isComplete = total > 0 && completed === total;
  const riskStatus = project.dueDate && new Date(project.dueDate) < new Date() && !isComplete ? 'OVERDUE' : 'ON_TRACK';
  res.json({
    project: {
      ...project,
      progressPercentage: total === 0 ? 0 : Math.round((completed / total) * 100),
      riskStatus
    }
  });
}));

projectsRouter.put('/:id', asyncHandler(updateProjectHandler));
projectsRouter.patch('/:id', asyncHandler(updateProjectHandler));

projectsRouter.delete('/:id', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  await assertProjectAccess(req.user, id);
  await prisma.project.delete({ where: { id } });
  res.status(204).send();
}));

projectsRouter.get('/:id/members', asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await assertProjectAccess(req.user, id);

  const members = await listProjectMembers(id);
  res.json({ members });
}));

projectsRouter.post('/:id/members', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  await assertProjectAccess(req.user, id);
  const data = addMemberSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ApiError(404, 'No user found with this email. Ask them to sign up first.');
  if (!user.isActive) throw new ApiError(400, 'Cannot assign a disabled user to a team.');

  if (req.user.role !== 'ADMIN' && user.id === req.user.id) {
    throw new ApiError(403, 'You cannot assign yourself to a team');
  }

  if (user.role === 'MEMBER') {
    const existingTeamMembership = await prisma.projectMember.findFirst({
      where: {
        userId: user.id,
        projectId: { not: id }
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });

    if (existingTeamMembership) {
      throw new ApiError(
        409,
        `This member already belongs to "${existingTeamMembership.project.name}" and can only belong to one team`
      );
    }
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: id, userId: user.id } },
    update: { role: data.role },
    create: { projectId: id, userId: user.id, role: data.role },
    include: { user: { select: userSelect } }
  });

  res.status(201).json({ member });
}));

projectsRouter.put('/:id/members/:memberId', asyncHandler(updateProjectMemberHandler));
projectsRouter.patch('/:id/members/:memberId', asyncHandler(updateProjectMemberHandler));

projectsRouter.delete('/:id/members/:memberId', asyncHandler(deleteProjectMemberHandler));
