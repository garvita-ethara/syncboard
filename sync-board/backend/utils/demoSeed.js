import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const DEMO_PROJECTS = [
  {
    name: 'Website Redesign 2025',
    team: 'Design & Frontend',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    description: 'Complete overhaul of the marketing website with modern design system and improved mobile experience.'
  },
  {
    name: 'API Modernization',
    team: 'Backend',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    description: 'Migrate legacy REST APIs to GraphQL and implement caching layer for 10x performance improvement.'
  },
  {
    name: 'Mobile App Launch',
    team: 'Product',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    description: 'iOS and Android apps with real-time sync, offline mode, and push notifications.'
  },
  {
    name: 'Analytics Dashboard',
    team: 'Data & Analytics',
    priority: 'MEDIUM',
    status: 'NOT_STARTED',
    description: 'Build comprehensive analytics platform with custom dashboards and reporting.'
  },
  {
    name: 'Security Audit & Compliance',
    team: 'Security & DevOps',
    priority: 'HIGH',
    status: 'COMPLETED',
    description: 'Full security audit, SOC 2 compliance, and penetration testing.'
  }
];

const DEMO_USERS = [
  { email: 'marcus.johnson@gmail.com', name: 'Marcus Johnson', presence: 'ACTIVE' },
  { email: 'elena.rodriguez@gmail.com', name: 'Elena Rodriguez', presence: 'IDLE' },
  { email: 'alex.chen@gmail.com', name: 'Alex Chen', presence: 'ACTIVE' },
  { email: 'sophia.patel@gmail.com', name: 'Sophia Patel', presence: 'AWAY' },
  { email: 'james.wilson@gmail.com', name: 'James Wilson', presence: 'ACTIVE' }
];

function initialsFromName(name) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

async function findSeedAdmin() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' }
  });
  if (existingAdmin) return existingAdmin;

  const passwordHash = await bcrypt.hash('Welcome@2025', 12);
  return prisma.user.create({
    data: {
      email: 'garvita.singh@gmail.com',
      name: 'Garvita Singh',
      passwordHash,
      role: 'ADMIN',
      presence: 'ACTIVE',
      isActive: true,
      avatarInitials: 'GS'
    }
  });
}

async function getDemoProjectIds() {
  const projects = await prisma.project.findMany({
    where: { name: { in: DEMO_PROJECTS.map((p) => p.name) } },
    select: { id: true, name: true }
  });
  return projects.map((p) => p.id);
}

async function hasDuplicateDemoProjects() {
  const grouped = await prisma.project.groupBy({
    by: ['name'],
    where: { name: { in: DEMO_PROJECTS.map((p) => p.name) } },
    _count: { name: true }
  });

  const anyDuplicate = grouped.some((g) => (g?._count?.name || 0) > 1);
  const countByName = new Map(grouped.map((g) => [g.name, g?._count?.name || 0]));
  const missingAny = DEMO_PROJECTS.some((p) => (countByName.get(p.name) || 0) === 0);

  return anyDuplicate || missingAny;
}

async function deleteDemoData() {
  const demoProjectIds = await getDemoProjectIds();
  if (demoProjectIds.length === 0) return;

  const tasks = await prisma.task.findMany({
    where: { projectId: { in: demoProjectIds } },
    select: { id: true }
  });
  const taskIds = tasks.map((t) => t.id);

  if (taskIds.length) {
    await prisma.taskComment.deleteMany({ where: { taskId: { in: taskIds } } });
  }
  await prisma.task.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.projectMember.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.project.deleteMany({ where: { id: { in: demoProjectIds } } });
}

async function ensureDemoUsers(passwordHash) {
  const created = [];
  for (const member of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {
        name: member.name,
        presence: member.presence,
        isActive: true,
        avatarInitials: initialsFromName(member.name)
      },
      create: {
        email: member.email,
        name: member.name,
        passwordHash,
        role: 'MEMBER',
        presence: member.presence,
        isActive: true,
        avatarInitials: initialsFromName(member.name)
      }
    });
    created.push(user);
  }
  return created;
}

async function createDemoProjects(seedAdmin, demoUsers) {
  const allMembers = [seedAdmin, ...demoUsers];

  for (const project of DEMO_PROJECTS) {
    const createdProject = await prisma.project.create({
      data: {
        name: project.name,
        description: project.description,
        team: project.team,
        priority: project.priority,
        status: project.status,
        createdBy: seedAdmin.id,
        members: {
          create: allMembers.map((u) => ({
            userId: u.id,
            role: u.id === seedAdmin.id ? 'ADMIN' : 'MEMBER'
          }))
        }
      }
    });

    // Minimal starter tasks (enough for UI to look alive)
    await prisma.task.createMany({
      data: [
        {
          title: 'Kickoff & requirements',
          description: `Initial alignment for ${createdProject.name}`,
          projectId: createdProject.id,
          priority: 'MEDIUM',
          status: project.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
          assignedTo: allMembers[1]?.id || null,
          createdBy: seedAdmin.id
        },
        {
          title: 'Execution plan',
          description: `Milestones and delivery plan for ${createdProject.name}`,
          projectId: createdProject.id,
          priority: 'HIGH',
          status: project.status === 'NOT_STARTED' ? 'NOT_STARTED' : 'IN_PROGRESS',
          assignedTo: allMembers[2]?.id || null,
          createdBy: seedAdmin.id
        }
      ]
    });
  }
}

export async function ensureCompanyDemoData() {
  // Only run in production-like environments to avoid slowing local dev.
  // If you want it locally, set FORCE_DEMO_SEED=true.
  const shouldRun = process.env.FORCE_DEMO_SEED === 'true' || process.env.NODE_ENV === 'production';
  if (!shouldRun) return;

  const needsRepair = await hasDuplicateDemoProjects();
  if (!needsRepair) return;

  console.log('🧹 Demo data repair: cleaning duplicates and reseeding once...');

  const seedAdmin = await findSeedAdmin();
  const passwordHash = await bcrypt.hash('Welcome@2025', 12);

  await prisma.$transaction(async () => {
    await deleteDemoData();
    const demoUsers = await ensureDemoUsers(passwordHash);
    await createDemoProjects(seedAdmin, demoUsers);
  });

  console.log('✅ Demo data repair complete (single clean set).');
}
