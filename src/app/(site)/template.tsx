import { PageMotion } from "@/motion/PageMotion";

/**
 * template.tsx se vuelve a montar en cada navegación: aquí vive el movimiento de
 * cada página (revelados, parallax, vídeos, apertura de la cortinilla), que se crea
 * al entrar y se destruye al salir.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <PageMotion>{children}</PageMotion>;
}
