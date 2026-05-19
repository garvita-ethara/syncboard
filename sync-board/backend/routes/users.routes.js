import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler, sanitizeUser } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { idParamSchema, presenceSchema, userCreateSchema, userPasswordUpdateSchema, userSelfUpdateSchema, userUpdateSchema } from '../utils/validators.js';

export const usersRouter = express.Router();
usersRouter.use(requireAuth);

const userBaseSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  presence: true,
  avatarInitials: true,
  isActive: true,
  lastActive: true,
  createdAt: true,
  updatedAt: true
};

function assertAdmin(req) {
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Admin access required');
  }
}

usersRouter.get('/me/profile', asyncHandler(async (req, res) => {
  const [assignedTasks, completedTasks, assignedProjects] = await Promise.all([
    prisma.task.count({ where: { assignedTo: req.user.id } }),
    prisma.task.count({ where: { assignedTo: req.user.id, status: 'COMPLETED' } }),
    prisma.projectMember.count({ where: { userId: req.user.id } })
  ]);

  res.json({
    user: sanitizeUser(req.user),
    stats: {
      assignedTasks,
      completedTasks,
      assignedProjects
    }
  });
}));

usersRouter.patch('/me', asyncHandler(async (req, res) => {
  const data = userSelfUpdateSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(data.name !== undefined ? {
        name: data.name,
        avatarInitials: data.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
      } : {})
    }
  });

  res.json({ user: sanitizeUser(user) });
}));

usersRouter.patch('/me/presence', asyncHandler(async (req, res) => {
  const data = presenceSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      presence: data.presence,
      lastActive: new Date()
    }
  });

  res.json({ user: sanitizeUser(user) });
}));

usersRouter.patch('/me/password', asyncHandler(async (req, res) => {
  const data = userPasswordUpdateSchema.parse(req.body);
  const current = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, passwordHash: true }
  });
  if (!current) throw new ApiError(404, 'User not found');

  const valid = await bcrypt.compare(data.currentPassword, current.passwordHash);
  if (!valid) throw new ApiError(400, 'Current password is incorrect');
  if (data.currentPassword === data.newPassword) {
    throw new ApiError(400, 'New password must be different from current password');
  }

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash, lastActive: new Date() }
  });

  res.json({ ok: true, message: 'Password updated successfully' });
}));

usersRouter.get('/team', asyncHandler(async (req, res) => {
  let teamUserFilter = { isActive: true };
  if (req.user.role !== 'ADMIN') {
    const myMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true }
    });
    const projectIds = myMemberships.map((item) => item.projectId);

    if (projectIds.length === 0) {
      return res.json({ users: [], totalTasksCount: 0 });
    }

    teamUserFilter = {
      isActive: true,
      memberships: {
        some: {
          projectId: { in: projectIds }
        }
      }
    };
  }

  const users = await prisma.user.findMany({
    where: teamUserFilter,
    select: {
      ...userBaseSelect,
      _count: {
        select: { memberships: true, assignedTasks: true, createdProjects: true }
      }
    },
    orderBy: [{ name: 'asc' }]
  });

  const totalTasksCount = await prisma.task.count({
    where: req.user.role === 'ADMIN'
      ? {}
      : { assignedTo: req.user.id }
  });

  const completedByUser = await prisma.task.groupBy({
    by: ['assignedTo'],
    where: {
      assignedTo: { not: null },
      status: 'COMPLETED'
    },
    _count: { assignedTo: true }
  });
  const completedMap = new Map(
    completedByUser.map((item) => [item.assignedTo, item._count.assignedTo])
  );

  res.json({
    users: users.map((member) => ({
      ...member,
      completedTasks: completedMap.get(member.id) || 0
    })),
    totalTasksCount
  });
}));

usersRouter.get('/', asyncHandler(async (req, res) => {
  assertAdmin(req);

  const users = await prisma.user.findMany({
    select: {
      ...userBaseSelect,
      _count: {
        select: { memberships: true, assignedTasks: true, createdProjects: true }
      }
    },
    orderBy: [{ createdAt: 'desc' }]
  });

  res.json({ users });
}));

usersRouter.get('/:id', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...userBaseSelect,
      _count: {
        select: { memberships: true, assignedTasks: true, createdProjects: true }
      }
    }
  });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user });
}));

usersRouter.post('/', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const data = userCreateSchema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new ApiError(409, 'Email is already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      presence: 'AWAY',
      isActive: data.isActive,
      avatarInitials: data.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    },
    select: userBaseSelect
  });

  res.status(201).json({ user });
}));

usersRouter.patch('/:id', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  const data = userUpdateSchema.parse(req.body);

  if (id === req.user.id && data.role && data.role !== 'ADMIN') {
    throw new ApiError(400, 'You cannot demote your own admin role');
  }

  if (data.email) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists && exists.id !== id) throw new ApiError(409, 'Email is already registered');
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? {
        name: data.name,
        avatarInitials: data.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
      } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
    },
    select: userBaseSelect
  });

  res.json({ user });
}));

usersRouter.patch('/:id/disable', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  if (id === req.user.id) {
    throw new ApiError(400, 'You cannot disable your own account');
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true }
  });
  if (!target) throw new ApiError(404, 'User not found');

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: !target.isActive },
    select: userBaseSelect
  });

  res.json({ user });
}));

usersRouter.post('/:id/reset-password', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  const tempPassword = String(req.body?.temporaryPassword || '').trim();
  if (!tempPassword || tempPassword.length < 6) {
    throw new ApiError(400, 'Temporary password must be at least 6 characters');
  }

  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id },
    data: { passwordHash }
  });

  res.json({ ok: true, message: 'Password reset successfully' });
}));

usersRouter.delete('/:id', asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id } = idParamSchema.parse(req.params);
  if (id === req.user.id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}));
