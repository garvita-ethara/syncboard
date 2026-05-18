import express from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

export const adminRouter = express.Router();
adminRouter.use(requireAuth);

// Admin only: Reset database (delete all data)
adminRouter.post('/reset-db', asyncHandler(async (req, res) => {
  // Only allow ADMIN role
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Require confirmation header to prevent accidental resets
  if (req.headers['x-confirm-reset'] !== 'true') {
    return res.status(400).json({ error: 'Missing confirmation header: x-confirm-reset: true' });
  }

  try {
    console.log('🧹 Admin reset initiated...');
    
    await prisma.taskComment.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.projectMember.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.userPreference.deleteMany({});
    
    // Keep the admin user, just delete everyone else
    await prisma.user.deleteMany({
      where: { email: { not: req.user.email } }
    });

    res.json({ 
      message: 'Database reset successfully',
      adminUserPreserved: req.user.email
    });
  } catch (err) {
    console.error('Reset failed:', err);
    res.status(500).json({ error: err.message });
  }
}));
