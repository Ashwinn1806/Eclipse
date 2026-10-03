import { PrismaClient } from '@prisma/client';

async function main() {
  const url = 'postgresql://neondb_owner:npg_brKNl62cFyAT@ep-nameless-river-b4w9giy1.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30&pool_timeout=30';
  console.log('Testing woken endpoint:', url);

  const client = new PrismaClient({ datasources: { db: { url } } });
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempt ${attempt}...`);
      await client.$connect();
      console.log('Connected!');
      const users = await client.user.findMany();
      console.log('Success! Users length:', users.length);
      console.log('Users:', JSON.stringify(users, null, 2));
      await client.$disconnect();
      return;
    } catch (err: any) {
      console.error(`Attempt ${attempt} error:`, err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

main();
