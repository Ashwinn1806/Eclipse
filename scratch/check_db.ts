import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users count:', users.length);
  console.log('Users:', JSON.stringify(users, null, 2));

  const goals = await prisma.userGoal.findMany();
  console.log('Goals count:', goals.length);
  console.log('Goals:', JSON.stringify(goals, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
