import express from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { projectVisibilityWhere } from '../utils/access.js';

export const dashboardRouter = express.Router();
dashboardRouter.use(requireAuth);

const taskCardSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  projectId: true,
  assignedTo: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true } }
};

function toStatusMap(groups) {
  return Object.fromEntries(groups.map((item) => [item.status, item._count.status]));
}

function toPriorityMap(groups) {
  return Object.fromEntries(groups.map((item) => [item.priority, item._count.priority]));
}

function buildTeamPerformance(projects) {
  const teamMap = new Map();

  projects.forEach((project) => {
    const teamName = project.team || 'General';
    const current = teamMap.get(teamName) || {
      name: teamName,
      memberCount: 0,
      totalTasks: 0,
      completedTasks: 0,
      projectCount: 0
    };
    const completedTasks = project.tasks.filter((task) => task.status === 'COMPLETED').length;

    current.memberCount += project._count.members;
    current.totalTasks += project._count.tasks;
    current.completedTasks += completedTasks;
    current.projectCount += 1;

    teamMap.set(teamName, current);
  });

  return [...teamMap.values()]
    .map((team) => ({
      ...team,
      completionRate: team.totalTasks === 0 ? 0 : Math.round((team.completedTasks / team.totalTasks) * 100)
    }))
    .sort((a, b) => b.completedTasks - a.completedTasks);
}

function mapProjectProgress(project) {
  const total = project.tasks.length;
  const completed = project.tasks.filter((task) => task.status === 'COMPLETED').length;

  return {
    id: project.id,
    name: project.name,
    team: project.team,
    status: project.status,
    description: project.description,
    createdAt: project.createdAt,
    memberCount: project._count.members,
    taskCount: project._count.tasks,
    progress: total === 0 ? 0 : Math.round((completed / total) * 100)
  };
}

async function buildDashboardData(user) {
  const now = new Date();
  const upcomingLimitDate = new Date(now);
  upcomingLimitDate.setDate(upcomingLimitDate.getDate() + 7);
  const isWorkspaceAdmin = user.role === 'ADMIN';

  const manageableProjects = await prisma.project.findMany({
    where: {
      OR: [
        { createdBy: user.id },
        { members: { some: { userId: user.id, role: 'ADMIN' } } }
      ]
    },
    select: { id: true, name: true, description: true, createdAt: true, status: true }
  });

  const dashboardRole = (isWorkspaceAdmin || manageableProjects.length > 0) ? 'ADMIN' : 'MEMBER';
  const teamPresenceSummary = await prisma.user.groupBy({
    by: ['presence'],
    where: { isActive: true },
    _count: { presence: true }
  });
  const presenceSummary = {
    ACTIVE: 0,
    IDLE: 0,
    AWAY: 0,
    DND: 0
  };
  teamPresenceSummary.forEach((item) => {
    presenceSummary[item.presence] = item._count.presence;
  });

  if (dashboardRole === 'ADMIN') {
    const managedProjectIds = manageableProjects.map((project) => project.id);
    const projectWhere = isWorkspaceAdmin ? {} : { id: { in: managedProjectIds } };
    const taskWhere = isWorkspaceAdmin ? {} : { projectId: { in: managedProjectIds } };

    const [
      projectCount,
      completedProjects,
      activeProjects,
      totalTasks,
      assignedTasks,
      todoTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      statusGroups,
      priorityGroups,
      recentTasks,
      upcomingTasks,
      overdueTaskList,
      projectProgressSource,
      uniqueTeams,
      taskAllocationGroups,
      dailyCompletionGroups
    ] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.project.count({ where: { AND: [projectWhere, { status: 'COMPLETED' }] } }),
      prisma.project.count({ where: { AND: [projectWhere, { status: { not: 'COMPLETED' } }] } }),
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { AND: [taskWhere, { assignedTo: { not: null } }] } }),
      prisma.task.count({ where: { AND: [taskWhere, { status: 'NOT_STARTED' }] } }),
      prisma.task.count({ where: { AND: [taskWhere, { status: 'IN_PROGRESS' }] } }),
      prisma.task.count({ where: { AND: [taskWhere, { status: 'COMPLETED' }] } }),
      prisma.task.count({ where: { AND: [taskWhere, { dueDate: { lt: now }, status: { not: 'COMPLETED' } }] } }),
      prisma.task.groupBy({ by: ['status'], where: taskWhere, _count: { status: true } }),
      prisma.task.groupBy({ by: ['priority'], where: taskWhere, _count: { priority: true } }),
      prisma.task.findMany({
        where: taskWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: taskCardSelect
      }),
      prisma.task.findMany({
        where: {
          AND: [
            taskWhere,
            { dueDate: { not: null, gte: now, lte: upcomingLimitDate } },
            { status: { not: 'COMPLETED' } }
          ]
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: taskCardSelect
      }),
      prisma.task.findMany({
        where: {
          AND: [
            taskWhere,
            { dueDate: { lt: now } },
            { status: { not: 'COMPLETED' } }
          ]
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        select: taskCardSelect
      }),
      prisma.project.findMany({
        where: projectWhere,
        include: {
          _count: { select: { tasks: true, members: true } },
          tasks: { select: { status: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.project.groupBy({ by: ['team'], where: projectWhere }),
      prisma.task.groupBy({
        by: ['assignedTo'],
        where: { AND: [taskWhere, { assignedTo: { not: null } }] },
        _count: { assignedTo: true }
      }),
      prisma.task.findMany({
        where: { AND: [taskWhere, { status: 'COMPLETED', updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }] },
        select: { updatedAt: true }
      })
    ]);

    // Fetch user names for allocation
    const userIds = taskAllocationGroups.map((g) => g.assignedTo);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userNameMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const taskAllocation = taskAllocationGroups.map((g) => ({
      name: userNameMap[g.assignedTo] || 'Unknown',
      count: g._count.assignedTo
    }));
    const teamPerformance = buildTeamPerformance(projectProgressSource);

    // Daily completions
    const dailyCompletion = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      const count = dailyCompletionGroups.filter((t) => t.updatedAt.toISOString().split('T')[0] === dateStr).length;
      return { date: dateStr, count };
    });

    return {
      dashboardRole,
      cards: {
        totalProjects: projectCount,
        activeProjects,
        completedProjects,
        totalTasks,
        assignedTasks,
        todoTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
        totalTeams: uniqueTeams.length,
        pendingTasks: todoTasks + inProgressTasks
      },
      charts: {
        status: toStatusMap(statusGroups),
        priority: toPriorityMap(priorityGroups),
        taskAllocation,
        dailyCompletion,
        teamPerformance
      },
      recentTasks,
      upcomingTasks,
      overdueTasksList: overdueTaskList,
      projectProgress: projectProgressSource.map(mapProjectProgress),
      teamPresence: presenceSummary
    };
  }

  const memberProjectWhere = projectVisibilityWhere(user);
  const myTaskWhere = { assignedTo: user.id };

  const [
    projectCount,
    completedProjects,
    activeProjects,
    totalTasks,
    assignedTasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    statusGroups,
    recentTasks,
    upcomingTasks,
    overdueTaskList,
    memberProjects,
    uniqueTeams,
    completedTasksList
  ] = await Promise.all([
    prisma.project.count({ where: memberProjectWhere }),
    prisma.project.count({ where: { AND: [memberProjectWhere, { status: 'COMPLETED' }] } }),
    prisma.project.count({ where: { AND: [memberProjectWhere, { status: { not: 'COMPLETED' } }] } }),
    prisma.task.count({ where: myTaskWhere }),
    prisma.task.count({ where: myTaskWhere }),
    prisma.task.count({ where: { AND: [myTaskWhere, { status: 'NOT_STARTED' }] } }),
    prisma.task.count({ where: { AND: [myTaskWhere, { status: 'IN_PROGRESS' }] } }),
    prisma.task.count({ where: { AND: [myTaskWhere, { status: 'COMPLETED' }] } }),
    prisma.task.count({ where: { AND: [myTaskWhere, { dueDate: { lt: now }, status: { not: 'COMPLETED' } }] } }),
    prisma.task.groupBy({ by: ['status'], where: myTaskWhere, _count: { status: true } }),
    prisma.task.findMany({
      where: myTaskWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: taskCardSelect
    }),
    prisma.task.findMany({
      where: {
        AND: [
          myTaskWhere,
          { dueDate: { not: null, gte: now, lte: upcomingLimitDate } },
          { status: { not: 'COMPLETED' } }
        ]
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: taskCardSelect
    }),
    prisma.task.findMany({
      where: {
        AND: [
          myTaskWhere,
          { dueDate: { lt: now } },
          { status: { not: 'COMPLETED' } }
        ]
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: taskCardSelect
    }),
    prisma.project.findMany({
      where: memberProjectWhere,
      include: {
        _count: { select: { tasks: true, members: true } },
        tasks: { select: { status: true } }
      },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.project.groupBy({ by: ['team'], where: memberProjectWhere }),
    prisma.task.findMany({
      where: { AND: [myTaskWhere, { status: 'COMPLETED', updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }] },
      select: { updatedAt: true }
    })
  ]);

  // Daily completions
  const dailyCompletion = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const count = completedTasksList.filter((t) => t.updatedAt.toISOString().split('T')[0] === dateStr).length;
    return { date: dateStr, count };
  });
  const teamPerformance = buildTeamPerformance(memberProjects);

  return {
    dashboardRole,
    cards: {
      totalProjects: projectCount,
      activeProjects,
      completedProjects,
      totalTasks,
      assignedTasks,
      todoTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      totalTeams: uniqueTeams.length,
      pendingTasks: todoTasks + inProgressTasks
    },
    charts: {
      myStatus: toStatusMap(statusGroups),
      dailyCompletion,
      teamPerformance
    },
    recentTasks,
    upcomingTasks,
    overdueTasksList: overdueTaskList,
    myAssignedTasks: totalTasks,
    myCompletedTasks: completedTasks,
    myPendingTasks: todoTasks + inProgressTasks,
    myOverdueTasks: overdueTasks,
    memberProjects: memberProjects.map(mapProjectProgress),
    teamPresence: presenceSummary
  };
}

dashboardRouter.get('/', asyncHandler(async (req, res) => {
  const data = await buildDashboardData(req.user);
  res.json(data);
}));

dashboardRouter.get('/summary', asyncHandler(async (req, res) => {
  const data = await buildDashboardData(req.user);
  res.json({
    dashboardRole: data.dashboardRole,
    cards: data.cards,
    charts: data.charts,
    myAssignedTasks: data.myAssignedTasks,
    myCompletedTasks: data.myCompletedTasks,
    myPendingTasks: data.myPendingTasks,
    myOverdueTasks: data.myOverdueTasks
  });
}));

dashboardRouter.get('/stats', asyncHandler(async (req, res) => {
  const data = await buildDashboardData(req.user);
  res.json({
    dashboardRole: data.dashboardRole,
    projectCounts: {
      total: data.cards.totalProjects || 0,
      active: data.cards.activeProjects || 0,
      completed: data.cards.completedProjects || 0
    },
    taskCounts: {
      total: data.cards.totalTasks || 0,
      assigned: data.cards.assignedTasks || 0,
      todo: data.cards.todoTasks || 0,
      inProgress: data.cards.inProgressTasks || 0,
      completed: data.cards.completedTasks || 0,
      overdue: data.cards.overdueTasks || 0
    },
    overdueTasksCount: data.cards.overdueTasks || 0,
    teamPresence: data.teamPresence || { ACTIVE: 0, IDLE: 0, AWAY: 0, DND: 0 }
  });
}));

dashboardRouter.get('/project-progress', asyncHandler(async (req, res) => {
  const data = await buildDashboardData(req.user);
  res.json({
    dashboardRole: data.dashboardRole,
    projects: data.dashboardRole === 'ADMIN' ? data.projectProgress : data.memberProjects
  });
}));

dashboardRouter.get('/recent-tasks', asyncHandler(async (req, res) => {
  const data = await buildDashboardData(req.user);
  res.json({
    dashboardRole: data.dashboardRole,
    tasks: data.recentTasks
  });
}));

dashboardRouter.get('/overdue-tasks', asyncHandler(async (req, res) => {
  const data = await buildDashboardData(req.user);
  res.json({
    dashboardRole: data.dashboardRole,
    tasks: data.overdueTasksList
  });
}));
