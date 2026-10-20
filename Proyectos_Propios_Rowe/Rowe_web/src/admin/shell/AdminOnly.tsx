import Link from "next/link";
import { mono } from "@/admin/ui/styles";

/** Pantalla reservada a administradores, vista por un editor. */
export function AdminOnly({ what }: { what: string }) {
  return (
    <div className="toast-in flex max-w-[560px] flex-col items-start gap-3 py-10">
      <span className={`${mono} text-muted`}>Solo administradores</span>
      <p className="headline-serif text-[34px] leading-none">
        Esta sección no está <em>en tu rol</em>
      </p>
      <p className="text-[14px] leading-relaxed text-muted">{what} Si necesitas un cambio, pídeselo a un administrador.</p>
      <Link href="/admin" className="mt-2 border-b border-line-cta text-[14px]">
        Volver al inicio
      </Link>
    </div>
  );
}
