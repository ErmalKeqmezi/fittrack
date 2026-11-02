import { Skeleton } from "@/components/skeleton";

export default function ExercisesLoading() {
  return (
    <div className="grid gap-5 lg:gap-6" aria-busy="true" aria-label="Loading exercises">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-12 rounded-xl" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
