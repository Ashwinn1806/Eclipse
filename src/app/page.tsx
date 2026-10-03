export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { auth } from '@/auth';
import EclipseDashboard from './EclipseDashboard';
import LoginWall from '@/components/LoginWall';
import { getTodayNutrition, getActiveUserGoal, getWeeklyWeightLogs } from '@/app/actions';

export default async function RootPage() {
  const session = await auth();

  // Unauthenticated — show the login wall
  if (!session?.user) {
    return <LoginWall />;
  }

  const [nutritionEntries, userGoal, weightLogs] = await Promise.all([
    getTodayNutrition(),
    getActiveUserGoal(),
    getWeeklyWeightLogs(),
  ]);

  return (
    <EclipseDashboard
      user={{
        name: session.user.name ?? 'Athlete',
        email: session.user.email ?? '',
        image: session.user.image ?? '',
      }}
      initialGoal={userGoal ? {
        targetDailyCals: userGoal.targetDailyCals,
        targetDailyProtein: userGoal.targetDailyProtein,
        targetDailyWaterMl: userGoal.targetDailyWaterMl,
      } : null}
      initialNutritionEntries={nutritionEntries || []}
      initialWeightLogs={(weightLogs || []).map((l) => ({ date: l.date, weightKg: l.morningWeight ?? 70 }))}
    />
  );
}
