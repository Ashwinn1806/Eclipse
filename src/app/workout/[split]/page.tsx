export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getSplitTonnageHistory, getSplitGhostData } from '@/app/actions/aiWorkout';
import { getPendingSessionWithSets } from '@/app/actions';
import { getSplitBySlug } from '@/lib/splits';
import WorkoutClient from './WorkoutClient';

export default async function SplitWorkoutPage({ params }: { params: Promise<{ split: string }> }) {
  const resolvedParams = await params;
  const rawSplit = resolvedParams?.split || 'push';
  const splitData = getSplitBySlug(rawSplit);

  const [historyData, pendingSession, serverGhosts] = await Promise.all([
    getSplitTonnageHistory(splitData.name),
    getPendingSessionWithSets(splitData.name),
    getSplitGhostData(splitData.name),
  ]);

  return (
    <WorkoutClient
      splitSlug={rawSplit}
      initialHistory={historyData || []}
      initialPendingSession={pendingSession}
      initialServerGhosts={serverGhosts || {}}
    />
  );
}
