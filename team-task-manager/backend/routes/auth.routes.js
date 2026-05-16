import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { ApiError, asyncHandler, sanitizeUser } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, signupSchema } from '../utils/validators.js';

export const authRouter = express.Router();

authRouter.post('/signup', asyncHandler(async (req, res) => {
  const data = signupSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, 'Email is already registered');

  const userCount = await prisma.user.count();
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: userCount === 0 ? 'ADMIN' : 'MEMBER',
      avatarInitials: data.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      presence: 'ACTIVE',
      isActive: true,
      lastActive: new Date()
    }
  });

  res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (!user.isActive) throw new ApiError(403, 'This account is disabled. Contact your administrator.');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid email or password');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastActive: new Date(),
      presence: 'ACTIVE'
    }
  });

  res.json({ token: signToken(user), user: sanitizeUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
}));

authRouter.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      lastActive: new Date(),
      presence: 'AWAY'
    }
  });
  res.status(200).json({ ok: true, message: 'Logged out successfully. Remove the client token to end the session.' });
}));
