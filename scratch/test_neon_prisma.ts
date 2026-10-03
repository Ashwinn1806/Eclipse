import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

async function main() {
  const connectionString = process.env.DATABASE_URL || '';
  console.log('Testing Prisma with Neon adapter...');

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany();
    console.log('SUCCESS PRISMA WITH NEON ADAPTER!');
    console.log('Users:', users);
  } catch (err: any) {
    console.error('Prisma Neon error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
