import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import EclipseDashboard from './EclipseDashboard';
import LoginWall from '@/components/LoginWall';

export default async function RootPage() {
  const session = await auth();

  // Unauthenticated — show the login wall
  if (!session?.user) {
    return <LoginWall />;
  }

  // First-time user with no goal set — redirect to onboarding
  // (EclipseDashboard handles the case gracefully too, but redirect is cleaner)
  return (
    <EclipseDashboard
      user={{
        name: session.user.name ?? 'Athlete',
        email: session.user.email ?? '',
        image: session.user.image ?? '',
      }}
    />
  );
}
