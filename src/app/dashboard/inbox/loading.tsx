import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div
      className="-mx-4 -my-6 flex h-[calc(100svh-3.5rem)] sm:-mx-6 lg:-mx-8"
      aria-busy="true"
      aria-label="Cargando bandeja"
    >
      <div className="grid w-full content-start gap-3 border-r p-4 md:w-80 xl:w-96">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex gap-3 py-1.5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-1 bg-muted/30 md:block" />
    </div>
  );
}
