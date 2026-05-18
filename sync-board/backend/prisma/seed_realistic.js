import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

const now = new Date();
const offsetDays = (days) => new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

async function main() {
  console.log('🌱 Seeding realistic demo data...');

  // Check if data already seeded
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'garvita.singh@gmail.com' }
  });
  
  if (existingAdmin) {
    console.log('✓ Data already seeded, skipping to avoid duplicates');
    return;
  }

  const passwordHash = await bcrypt.hash('Welcome@2025', 12);

  // 1. Create Admin User (First user)
  const admin = await prisma.user.upsert({
    where: { email: 'garvita.singh@gmail.com' },
    update: {},
    create: {
      email: 'garvita.singh@gmail.com',
      name: 'Garvita Singh',
      passwordHash,
      role: 'ADMIN',
      presence: 'ACTIVE',
      isActive: true,
      lastActive: now,
      avatarInitials: 'GS',
    }
  });
  console.log(`✓ Admin user: ${admin.email}`);

  // 2. Create Team Members (realistic names)
  const teamMembers = [
    { email: 'marcus.johnson@gmail.com', name: 'Marcus Johnson', presence: 'ACTIVE', lastActive: offsetDays(-1) },
    { email: 'elena.rodriguez@gmail.com', name: 'Elena Rodriguez', presence: 'IDLE', lastActive: offsetDays(-2) },
    { email: 'alex.chen@gmail.com', name: 'Alex Chen', presence: 'ACTIVE', lastActive: now },
    { email: 'sophia.patel@gmail.com', name: 'Sophia Patel', presence: 'AWAY', lastActive: offsetDays(-3) },
    { email: 'james.wilson@gmail.com', name: 'James Wilson', presence: 'ACTIVE', lastActive: offsetDays(-1) },
  ];

  const seededMembers = [admin];
  for (const member of teamMembers) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        ...member,
        passwordHash,
        role: 'MEMBER',
        isActive: true,
        avatarInitials: member.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      }
    });
    seededMembers.push(user);
  }
  console.log(`✓ Created ${teamMembers.length} team members`);

  // 3. Create Projects
  const projects = [
    {
      name: 'Website Redesign 2025',
      team: 'Design & Frontend',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      startDate: offsetDays(-14),
      dueDate: offsetDays(21),
      description: 'Complete overhaul of the marketing website with modern design system and improved mobile experience.'
    },
    {
      name: 'API Modernization',
      team: 'Backend',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      startDate: offsetDays(-7),
      dueDate: offsetDays(14),
      description: 'Migrate legacy REST APIs to GraphQL and implement caching layer for 10x performance improvement.'
    },
    {
      name: 'Mobile App Launch',
      team: 'Product',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      startDate: offsetDays(-21),
      dueDate: offsetDays(7),
      description: 'iOS and Android apps with real-time sync, offline mode, and push notifications.'
    },
    {
      name: 'Analytics Dashboard',
      team: 'Data & Analytics',
      priority: 'MEDIUM',
      status: 'NOT_STARTED',
      startDate: offsetDays(3),
      dueDate: offsetDays(45),
      description: 'Build comprehensive analytics platform with custom dashboards and reporting.'
    },
    {
      name: 'Security Audit & Compliance',
      team: 'Security & DevOps',
      priority: 'HIGH',
      status: 'COMPLETED',
      startDate: offsetDays(-30),
      dueDate: offsetDays(-2),
      description: 'Full security audit, SOC 2 compliance, and penetration testing.'
    }
  ];

  const seededProjects = [];
  for (const proj of projects) {
    const project = await prisma.project.create({
      data: {
        ...proj,
        createdBy: admin.id,
        members: {
          create: seededMembers.map(u => ({ userId: u.id, role: u.id === admin.id ? 'ADMIN' : 'MEMBER' }))
        }
      },
      include: { tasks: true }
    });
    seededProjects.push(project);
  }
  console.log(`✓ Created ${projects.length} projects`);

  // 4. Create Tasks for each project
  const tasksData = [
    // Website Redesign
    {
      projectIndex: 0,
      tasks: [
        { title: 'Design system audit', priority: 'HIGH', status: 'COMPLETED', assigneeIndex: 1, daysAgo: 10, estimatedTime: '8h' },
        { title: 'Create design mockups', priority: 'HIGH', status: 'COMPLETED', assigneeIndex: 1, daysAgo: 5, estimatedTime: '16h' },
        { title: 'Frontend implementation', priority: 'HIGH', status: 'IN_PROGRESS', assigneeIndex: 3, daysAgo: 0, daysFromNow: 10, estimatedTime: '24h' },
        { title: 'Mobile responsive testing', priority: 'MEDIUM', status: 'IN_PROGRESS', assigneeIndex: 3, daysAgo: 0, daysFromNow: 14, estimatedTime: '12h' },
        { title: 'Performance optimization', priority: 'MEDIUM', status: 'NOT_STARTED', assigneeIndex: 2, daysFromNow: 20, estimatedTime: '8h' }
      ]
    },
    // API Modernization
    {
      projectIndex: 1,
      tasks: [
        { title: 'Schema design for GraphQL', priority: 'HIGH', status: 'COMPLETED', assigneeIndex: 2, daysAgo: 6, estimatedTime: '12h' },
        { title: 'Implement GraphQL server', priority: 'URGENT', status: 'IN_PROGRESS', assigneeIndex: 2, daysAgo: 0, daysFromNow: 8, estimatedTime: '16h' },
        { title: 'Add caching layer', priority: 'HIGH', status: 'IN_PROGRESS', assigneeIndex: 4, daysAgo: 0, daysFromNow: 12, estimatedTime: '12h' },
        { title: 'Write API tests', priority: 'MEDIUM', status: 'NOT_STARTED', assigneeIndex: 4, daysFromNow: 13, estimatedTime: '10h' }
      ]
    },
    // Mobile App Launch
    {
      projectIndex: 2,
      tasks: [
        { title: 'iOS app development', priority: 'URGENT', status: 'IN_PROGRESS', assigneeIndex: 0, daysAgo: 0, daysFromNow: 7, estimatedTime: '32h' },
        { title: 'Android app development', priority: 'URGENT', status: 'IN_PROGRESS', assigneeIndex: 1, daysAgo: 0, daysFromNow: 7, estimatedTime: '32h' },
        { title: 'QA testing & bug fixes', priority: 'HIGH', status: 'IN_PROGRESS', assigneeIndex: 4, daysAgo: 0, daysFromNow: 5, estimatedTime: '16h' },
        { title: 'App store submission', priority: 'HIGH', status: 'NOT_STARTED', assigneeIndex: 0, daysFromNow: 7, estimatedTime: '4h' }
      ]
    },
    // Analytics Dashboard
    {
      projectIndex: 3,
      tasks: [
        { title: 'Requirements gathering', priority: 'MEDIUM', status: 'NOT_STARTED', assigneeIndex: 1, daysFromNow: 5, estimatedTime: '8h' },
        { title: 'Database schema design', priority: 'MEDIUM', status: 'NOT_STARTED', assigneeIndex: 2, daysFromNow: 10, estimatedTime: '12h' }
      ]
    },
    // Security Audit
    {
      projectIndex: 4,
      tasks: [
        { title: 'Security audit completed', priority: 'HIGH', status: 'COMPLETED', assigneeIndex: 4, daysAgo: 3, estimatedTime: '20h' },
        { title: 'SOC 2 compliance verified', priority: 'HIGH', status: 'COMPLETED', assigneeIndex: 2, daysAgo: 2, estimatedTime: '16h' },
        { title: 'Penetration testing done', priority: 'HIGH', status: 'COMPLETED', assigneeIndex: 4, daysAgo: 1, estimatedTime: '12h' }
      ]
    }
  ];

  for (const projTaskGroup of tasksData) {
    const project = seededProjects[projTaskGroup.projectIndex];
    for (const taskData of projTaskGroup.tasks) {
      const assignee = seededMembers[taskData.assigneeIndex];
      const startDate = taskData.daysAgo ? offsetDays(-taskData.daysAgo) : now;
      const dueDate = taskData.daysFromNow ? offsetDays(taskData.daysFromNow) : offsetDays(7);

      await prisma.task.create({
        data: {
          title: taskData.title,
          description: `Task for ${project.name}`,
          projectId: project.id,
          priority: taskData.priority,
          status: taskData.status,
          assignedTo: assignee.id,
          createdBy: admin.id,
          startDate,
          dueDate,
          estimatedTime: taskData.estimatedTime
        }
      });
    }
  }
  console.log('✓ Created tasks for all projects');

  // 5. Add some task comments
  const tasks = await prisma.task.findMany({ take: 5 });
  for (const task of tasks) {
    const commenter = seededMembers[Math.floor(Math.random() * seededMembers.length)];
    await prisma.taskComment.create({
      data: {
        taskId: task.id,
        userId: commenter.id,
        message: `Good progress on ${task.title}. Keep pushing forward!`,
        type: 'COMMENT'
      }
    });
  }
  console.log('✓ Added task comments');

  console.log('\n✨ Demo data seeding complete!');
  console.log('Login with any of these accounts:');
  console.log('  garvita.singh@gmail.com (Admin)');
  console.log('  marcus.johnson@gmail.com (Member)');
  console.log('  Password: Welcome@2025');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
