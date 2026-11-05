import { Skeleton } from "@/components/skeleton";

export default function BodyLoading() {
  return (
    <div className="grid gap-5 lg:gap-6" aria-busy="true" aria-label="Loading measurements">
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
