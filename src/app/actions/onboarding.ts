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
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  const userId = session.user.id;

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
