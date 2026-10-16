import { Skeleton } from "@/admin/ui/kit";

/** Esqueleto de carga del panel (diseño: bloques que laten). */
export function PanelSkeleton() {
  return (
    <div className="flex h-screen-safe bg-ink" aria-busy="true" aria-label="Cargando el panel">
      <div className="hidden w-[248px] flex-none border-r border-line-soft min-[820px]:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b border-line-soft" />
        <div className="p-4 min-[820px]:p-7">
          <ContentSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="flex max-w-[1240px] flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-60 rounded-md" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <Skeleton className="h-[110px]" />
        <Skeleton className="h-[110px]" />
        <Skeleton className="h-[110px]" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
