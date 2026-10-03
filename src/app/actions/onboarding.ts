'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface OnboardingData {
  currentWeightKg: number;
  targetWeightKg: number;
  goal: 'bulk' | 'cut' | 'maintain';
  activityLevel: string;
  tdeeKcal: number;
  dailyCalTarget: number;
  dailyProteinTarget: number;
}

/** Save (upsert) the user's onboarding goal into the database. */
export async function saveOnboardingGoal(data: OnboardingData) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch (err) {
    console.warn('[Eclipse Auth] Error fetching session:', err);
  }

  if (!userId && process.env.NODE_ENV === 'development') {
    userId = 'local-dev-user';
  }

  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (userId === 'local-dev-user') {
    try {
      await prisma.user.upsert({
        where: { id: 'local-dev-user' },
        update: {},
        create: {
          id: 'local-dev-user',
          name: 'Ashwin Verma',
          email: 'ashwin@local.dev',
        },
      });
    } catch (err) {
      console.warn('[Eclipse DB] Dev user upsert non-fatal error:', err);
    }
  }

  // Calculate a reasonable target date (12 weeks out)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 84);

  const goalLabel =
    data.goal === 'bulk' ? 'Bulk' : data.goal === 'cut' ? 'Cut' : 'Maintain';

  await prisma.userGoal.create({
    data: {
      userId,
      goalType: goalLabel,
      startWeight: data.currentWeightKg,
      targetWeight: data.targetWeightKg,
      targetDate,
      targetDailyCals: data.dailyCalTarget,
      targetDailyProtein: data.dailyProteinTarget,
      isActive: true,
    },
  });

  revalidatePath('/');
}
