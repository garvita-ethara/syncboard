import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING HIGH-FIDELITY SEED ---');
  
  const passwordHash = await bcrypt.hash('Karan123!', 12);
  
  // 1. Ensure Karan exists
  const karan = await prisma.user.upsert({
    where: { email: 'karan@syncboard.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'karan@syncboard.com',
      name: 'Karan',
      passwordHash,
      role: 'ADMIN',
      presence: 'ACTIVE',
      avatarInitials: 'K',
    },
  });
  console.log('✓ User "Karan" ready');

  // 2. Clear existing demo data to avoid duplicates (Optional but recommended for high-fidelity)
  // await prisma.task.deleteMany({});
  // await prisma.project.deleteMany({});

  // 3. Create Projects (Past, Present, Future)
  const now = new Date();
  
  const projectData = [
    {
      name: 'Mobile App Redesign',
      status: 'COMPLETED',
      priority: 'HIGH',
      team: 'Product',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      description: 'Complete overhaul of the mobile interface for iOS and Android.'
    },
    {
      name: 'SyncBoard Dashboard',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      team: 'Design',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days later
      description: 'Developing the main SaaS command center and analytics engine.'
    },
    {
      name: 'AI Analytics Module',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      team: 'Engineering',
      createdAt: now,
      dueDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days later
      description: 'Predictive workload analysis and automated task scheduling.'
    }
  ];

  const seededProjects = [];
  for (const p of projectData) {
    const project = await prisma.project.create({
      data: {
        ...p,
        createdBy: karan.id,
        members: {
          create: { userId: karan.id, role: 'ADMIN' }
        }
      }
    });
    seededProjects.push(project);
    console.log(`✓ Seeded Project: ${p.name}`);
  }

  // 4. Create Tasks
  const [mobileProject, dashboardProject, aiProject] = seededProjects;

  const tasks = [
    // Completed Tasks
    { title: 'Setup dashboard UI', status: 'COMPLETED', priority: 'HIGH', projectId: dashboardProject.id, assignedTo: karan.id, updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { title: 'Create login page', status: 'COMPLETED', priority: 'MEDIUM', projectId: dashboardProject.id, assignedTo: karan.id, updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    { title: 'Landing Page UI', status: 'COMPLETED', priority: 'HIGH', projectId: mobileProject.id, assignedTo: karan.id, updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
    
    // In Progress Tasks
    { title: 'Build task API', status: 'IN_PROGRESS', priority: 'URGENT', projectId: dashboardProject.id, assignedTo: karan.id, updatedAt: now },
    { title: 'Add notifications', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: dashboardProject.id, assignedTo: karan.id, updatedAt: now },
    { title: 'API Integration', status: 'IN_PROGRESS', priority: 'HIGH', projectId: mobileProject.id, assignedTo: karan.id, updatedAt: now },
    
    // Overdue Tasks
    { title: 'Fix sidebar responsiveness', status: 'IN_PROGRESS', priority: 'HIGH', projectId: dashboardProject.id, assignedTo: karan.id, dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    
    // Upcoming Tasks
    { title: 'Add realtime sync', status: 'NOT_STARTED', priority: 'MEDIUM', projectId: dashboardProject.id, assignedTo: karan.id, dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) },
    { title: 'Team analytics', status: 'NOT_STARTED', priority: 'LOW', projectId: aiProject.id, assignedTo: karan.id, dueDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000) },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        ...t,
        createdBy: karan.id,
        description: `High-fidelity task for ${t.title}`
      }
    });
  }
  console.log('✓ 20+ Realistic Tasks Seeded');

  // 5. Create activity (Comments) to simulate feed
  await prisma.taskComment.create({
    data: {
      taskId: (await prisma.task.findFirst({ where: { title: 'Landing Page UI' } })).id,
      userId: karan.id,
      message: 'Completed the initial UI draft for the landing page.',
      type: 'STATUS_CHANGE'
    }
  });

  console.log('--- SEEDING COMPLETE ---');
  console.log('Login with: karan@syncboard.com / Karan123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
