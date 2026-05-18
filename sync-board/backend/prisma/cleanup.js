import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up duplicate data...');

  // Delete everything and start fresh
  console.log('Deleting all records...');
  
  await prisma.taskComment.deleteMany({});
  console.log('✓ Task comments deleted');
  
  await prisma.task.deleteMany({});
  console.log('✓ Tasks deleted');
  
  await prisma.projectMember.deleteMany({});
  console.log('✓ Project members deleted');
  
  await prisma.project.deleteMany({});
  console.log('✓ Projects deleted');
  
  await prisma.userPreference.deleteMany({});
  console.log('✓ User preferences deleted');
  
  await prisma.user.deleteMany({});
  console.log('✓ Users deleted');

  console.log('\n✨ Database cleaned! Now run: npm run db:seed:realistic');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
