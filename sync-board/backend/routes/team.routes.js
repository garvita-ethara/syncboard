import express from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  presence: true,
  avatarInitials: true,
  isActive: true,
  lastActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { memberships: true, assignedTasks: true, createdProjects: true }
  }
};

export const teamRouter = express.Router();
teamRouter.use(requireAuth);

teamRouter.get('/', asyncHandler(async (req, res) => {
  let where = { isActive: true };
  if (req.user.role !== 'ADMIN') {
    const myMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true }
    });
    const projectIds = myMemberships.map((item) => item.projectId);
    if (projectIds.length === 0) {
      return res.json({ users: [] });
    }
    where = {
      isActive: true,
      memberships: { some: { projectId: { in: projectIds } } }
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: [{ name: 'asc' }]
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
    }))
  });
}));
