import { Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-5 lg:gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 lg:gap-6 xl:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:order-first xl:col-span-12 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl xl:col-span-5" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-7" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-7" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-5" />
      </div>
    </div>
  );
}
