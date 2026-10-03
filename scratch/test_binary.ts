import { PrismaClient } from '@prisma/client';

process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';

async function main() {
  const url = process.env.DATABASE_URL || '';
  console.log('Testing with binary engine type...');
  const client = new PrismaClient({ datasources: { db: { url } } });

  try {
    await client.$connect();
    console.log('CONNECTED WITH BINARY ENGINE!');
    const users = await client.user.findMany();
    console.log('Users:', users);
  } catch (err: any) {
    console.error('Binary Engine Connect Error:', err);
  } finally {
    await client.$disconnect();
  }
}

main();
