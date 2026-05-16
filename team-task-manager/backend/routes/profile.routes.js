import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler, sanitizeUser } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { presenceSchema, userPasswordUpdateSchema, userSelfUpdateSchema } from '../utils/validators.js';

export const profileRouter = express.Router();
profileRouter.use(requireAuth);

profileRouter.get('/', asyncHandler(async (req, res) => {
  const [assignedTasks, completedTasks, assignedProjects] = await Promise.all([
    prisma.task.count({ where: { assignedTo: req.user.id } }),
    prisma.task.count({ where: { assignedTo: req.user.id, status: 'COMPLETED' } }),
    prisma.projectMember.count({ where: { userId: req.user.id } })
  ]);

  res.json({
    user: sanitizeUser(req.user),
    stats: { assignedTasks, completedTasks, assignedProjects }
  });
}));

profileRouter.patch('/', asyncHandler(async (req, res) => {
  const { name, avatarInitials, currentPassword, newPassword, confirmPassword } = req.body || {};
  const payload = {};

  if (name !== undefined) {
    const parsed = userSelfUpdateSchema.parse({ name });
    payload.name = parsed.name;
    payload.avatarInitials = String(avatarInitials || parsed.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase());
  } else if (avatarInitials !== undefined) {
    payload.avatarInitials = String(avatarInitials).trim().slice(0, 4).toUpperCase();
  }

  if (newPassword !== undefined || currentPassword !== undefined || confirmPassword !== undefined) {
    const parsedPassword = userPasswordUpdateSchema.parse({
      currentPassword,
      newPassword,
      confirmPassword
    });
    const current = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true }
    });
    if (!current) throw new ApiError(404, 'User not found');

    const valid = await bcrypt.compare(parsedPassword.currentPassword, current.passwordHash);
    if (!valid) throw new ApiError(400, 'Current password is incorrect');
    payload.passwordHash = await bcrypt.hash(parsedPassword.newPassword, 12);
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, 'No valid profile fields provided');
  }

  payload.lastActive = new Date();
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: payload
  });

  res.json({ user: sanitizeUser(user) });
}));

profileRouter.patch('/presence', asyncHandler(async (req, res) => {
  const data = presenceSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { presence: data.presence, lastActive: new Date() }
  });

  res.json({
    user: sanitizeUser(user),
    event: {
      type: 'presence.updated',
      userId: user.id,
      presence: user.presence,
      at: new Date().toISOString()
    }
  });
}));
