import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL || '';
  console.log('Testing Prisma with Neon adapter + ws...');

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany();
    console.log('SUCCESS PRISMA WITH NEON ADAPTER + WS!');
    console.log('Users:', users);
  } catch (err: any) {
    console.error('Prisma Neon error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
