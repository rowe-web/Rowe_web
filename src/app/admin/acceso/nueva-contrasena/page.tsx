import type { Metadata } from "next";
import { NewPasswordForm } from "@/admin/screens/NewPasswordForm";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** Tras abrir el enlace del email (restablecer o invitación): crear la contraseña. */
export default function NewPasswordPage() {
  return (
    <main className="flex min-h-screen-safe items-center justify-center p-6">
      <NewPasswordForm />
    </main>
  );
}
