import { PrismaClient } from '@prisma/client';

async function main() {
  const url = 'postgresql://neondb_owner:npg_brKNl62cFyAT@52.95.251.153:5432/neondb?sslmode=require';
  console.log('Testing IP URL:', url);
  const client = new PrismaClient({ datasources: { db: { url } } });

  try {
    await client.$connect();
    console.log('CONNECTED TO IP!');
    const users = await client.user.findMany();
    console.log('Users:', users);
  } catch (err: any) {
    console.error('IP Connect Error:', err);
  } finally {
    await client.$disconnect();
  }
}

main();
