import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo123!', 12);

  // 1. Seed Users
  const users = [
    { email: 'sarah@syncboard.com', name: 'Sarah Chen', role: 'MEMBER' },
    { email: 'mike@syncboard.com', name: 'Mike Ross', role: 'MEMBER' },
    { email: 'jane@syncboard.com', name: 'Jane Doe', role: 'MEMBER' },
    { email: 'alex@syncboard.com', name: 'Alex Hunt', role: 'MEMBER' },
  ];

  const seededUsers = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        passwordHash,
        avatarInitials: u.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      },
    });
    seededUsers.push(user);
  }

  // Get Admin user to create projects
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase();
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    console.error('Admin user not found. Please run regular seed first.');
    return;
  }

  // 2. Seed Projects
  const projects = [
    { name: 'SyncBoard UI Overhaul', team: 'Design', priority: 'HIGH', status: 'IN_PROGRESS' },
    { name: 'Mobile App V2', team: 'Product', priority: 'MEDIUM', status: 'NOT_STARTED' },
    { name: 'Cloud Infrastructure', team: 'DevOps', priority: 'URGENT', status: 'IN_PROGRESS' },
  ];

  for (const p of projects) {
    const project = await prisma.project.create({
      data: {
        ...p,
        createdBy: admin.id,
        description: `High-priority work for the ${p.name} initiative.`,
        members: {
          create: seededUsers.map(u => ({ userId: u.id, role: 'MEMBER' })),
        },
        tasks: {
          create: [
            {
              title: `Kickoff ${p.name}`,
              description: 'Initial brainstorming session.',
              priority: 'HIGH',
              status: 'DONE',
              createdBy: admin.id,
              assignedTo: seededUsers[0].id,
            },
            {
              title: `Research competitors for ${p.name}`,
              priority: 'MEDIUM',
              status: 'IN_PROGRESS',
              createdBy: admin.id,
              assignedTo: seededUsers[1].id,
            },
            {
              title: `Define roadmap for ${p.name}`,
              priority: 'URGENT',
              status: 'NOT_STARTED',
              createdBy: admin.id,
              assignedTo: seededUsers[2].id,
            }
          ]
        }
      },
    });
    console.log(`Seeded project: ${project.name}`);
  }

  console.log('Dummy data seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
