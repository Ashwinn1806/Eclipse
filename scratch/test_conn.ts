import { PrismaClient } from '@prisma/client';

async function testConn(url: string, label: string) {
  console.log(`Testing ${label}...`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const users = await prisma.user.findMany();
    console.log(`Success ${label}! User count:`, users.length);
    return { prisma, users };
  } catch (err: any) {
    console.error(`Failed ${label}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const envUrl = process.env.DATABASE_URL || '';
  console.log('Original URL:', envUrl);

  // Try original
  await testConn(envUrl, 'Original');

  // Try without channel_binding
  const noCB = envUrl.replace('&channel_binding=require', '').replace('?channel_binding=require', '');
  await testConn(noCB, 'No channel_binding');

  // Try direct host without -pooler
  const directUrl = noCB.replace('-pooler', '');
  await testConn(directUrl, 'Direct host without -pooler');
}

main();
