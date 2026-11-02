import { Skeleton } from "@/components/skeleton";

export default function PlansLoading() {
  return (
    <div className="grid gap-5 lg:gap-6" aria-busy="true" aria-label="Loading plans">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
