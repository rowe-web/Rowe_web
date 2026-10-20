import Link from "next/link";

/** Barra fija de la vista previa: recuerda que es el borrador y lleva de vuelta al panel. */
export function PreviewBar() {
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[700] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3 rounded-full border border-line-strong bg-[rgb(10_10_10/0.92)] py-2 pl-4 pr-2 backdrop-blur-md">
      <span className="h-2 w-2 flex-none animate-rec rounded-full bg-rec" aria-hidden="true" />
      <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-bone">Vista previa · borrador sin publicar</span>
      <Link href="/admin" className="flex h-8 flex-none items-center rounded-full bg-bone px-3.5 text-[12px] text-ink">
        Volver al panel
      </Link>
    </div>
  );
}
