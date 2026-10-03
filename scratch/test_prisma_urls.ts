import { PrismaClient } from '@prisma/client';

const urls = [
  'postgresql://neondb_owner:npg_brKNl62cFyAT@ep-nameless-river-b4w9giy1-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_brKNl62cFyAT@ep-nameless-river-b4w9giy1.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_brKNl62cFyAT@ep-nameless-river-b4w9giy1-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true',
  'postgresql://neondb_owner:npg_brKNl62cFyAT@ep-nameless-river-b4w9giy1.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=15',
  'postgresql://neondb_owner:npg_brKNl62cFyAT@ep-nameless-river-b4w9giy1-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=no-verify',
];

async function main() {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n--- Testing URL #${i + 1} ---`);
    console.log(url);
    const client = new PrismaClient({ datasources: { db: { url } } });
    try {
      const users = await client.user.findMany();
      console.log(`SUCCESS URL #${i + 1}! Users found:`, users.length);
      console.log('User data:', JSON.stringify(users, null, 2));
      await client.$disconnect();
      return;
    } catch (err: any) {
      console.error(`FAILED URL #${i + 1}:`, err.message);
    } finally {
      await client.$disconnect();
    }
  }
}

main();
