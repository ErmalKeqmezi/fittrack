import { Skeleton } from "@/components/skeleton";

export default function WorkoutLoading() {
  return (
    <div className="grid gap-5 lg:gap-6" aria-busy="true" aria-label="Loading workout">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
