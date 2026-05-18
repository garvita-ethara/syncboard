import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123!';
  const name = process.env.ADMIN_NAME || 'Admin User';

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: 'ADMIN', isActive: true, presence: 'ACTIVE' },
    create: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      presence: 'ACTIVE',
      avatarInitials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    }
  });

  console.log(`Seeded user: ${admin.email}`);
  console.log('No default projects or tasks were seeded.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
