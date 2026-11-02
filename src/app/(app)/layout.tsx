import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ConnectionStatus } from "@/components/pwa/connection-status";
import { requireUser } from "@/features/auth/queries";
import { WorkoutBanner } from "@/features/workouts/components/workout-banner";
import { getInProgressWorkout } from "@/features/workouts/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const inProgress = await getInProgressWorkout();

  return (
    <div className="flex flex-1">
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-10">
          <ConnectionStatus />
          {inProgress ? <WorkoutBanner workout={inProgress} /> : null}
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
