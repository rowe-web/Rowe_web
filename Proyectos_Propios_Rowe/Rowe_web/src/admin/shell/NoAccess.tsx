import { signOut } from "@/admin/actions/auth";
import { mono } from "@/admin/ui/styles";

/** Usuario con sesión pero sin rol asignado (p. ej. invitación pendiente de rol). */
export function NoAccess({ email }: { email: string }) {
  return (
    <main className="flex min-h-screen-safe items-center justify-center p-6">
      <div className="flex w-[min(420px,100%)] flex-col gap-5">
        <span className={`${mono} text-muted`}>Panel · Sin acceso</span>
        <h1 className="headline-serif text-[40px] leading-[0.95]">
          Aún no tienes <em>acceso.</em>
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Has entrado como <span className="text-bone">{email}</span>, pero tu usuario no tiene rol en el panel. Pide a un administrador que te lo asigne
          en «Usuarios».
        </p>
        <form action={signOut}>
          <button type="submit" className="h-10 rounded-full border border-line-input px-5 text-[14px] hover:border-bone">
            Salir
          </button>
        </form>
      </div>
    </main>
  );
}
