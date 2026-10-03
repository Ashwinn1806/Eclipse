import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL || '';
  console.log('Testing Neon Serverless adapter with connection string:', connectionString);

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany();
    console.log('SUCCESS VIA NEON ADAPTER!');
    console.log('Users count:', users.length);
    console.log('Users:', JSON.stringify(users, null, 2));
  } catch (err: any) {
    console.error('Neon Adapter Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
