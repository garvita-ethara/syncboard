import { prisma } from '../lib/prisma.js';

export const ACTIVITY_AUDIENCE = {
  ADMINS: 'ADMINS',
  PROJECT_MEMBERS: 'PROJECT_MEMBERS',
  USER_AND_ADMINS: 'USER_AND_ADMINS',
  ALL: 'ALL'
};

export async function logActivity(actor, payload) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: actor?.id || null,
        actorName: actor?.name || actor?.email || 'System',
        actorRole: actor?.role || 'SYSTEM',
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId || null,
        message: payload.message,
        audience: payload.audience || ACTIVITY_AUDIENCE.ADMINS,
        projectId: payload.projectId || null,
        targetUserId: payload.targetUserId || null
      }
    });
  } catch (error) {
    // Activity logging should never block the primary request.
    console.error('Activity log write failed:', error);
  }
}

export async function listVisibleActivities(user, { take = 20 } = {}) {
  if (user.role === 'ADMIN') {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take
    });
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    select: { projectId: true }
  });
  const projectIds = memberships.map((item) => item.projectId);

  return prisma.activityLog.findMany({
    where: {
      OR: [
        { audience: ACTIVITY_AUDIENCE.ALL },
        { audience: ACTIVITY_AUDIENCE.USER_AND_ADMINS, targetUserId: user.id },
        {
          audience: ACTIVITY_AUDIENCE.PROJECT_MEMBERS,
          projectId: { in: projectIds.length ? projectIds : ['__none__'] }
        }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take
  });
}
