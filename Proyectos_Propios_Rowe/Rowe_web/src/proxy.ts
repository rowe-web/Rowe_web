import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublishedProject } from "@/lib/project-slugs";
import { REMEMBER_COOKIE, sessionCookieOptions } from "@/lib/supabase/cookies";

/**
 * Proxy:
 *  - /proyectos/<slug>: si el proyecto no está publicado, 404 real (antes de renderizar,
 *    así no se envía un 200 con la página de error). Ver src/lib/project-slugs.ts.
 *
 * Panel (/admin y /vista-previa):
 *  - Renueva la sesión de Supabase en cada petición (cookies).
 *  - Sin sesión → al login, recordando a dónde iba.
 *  - Con sesión en el login → al panel.
 * El ROL se comprueba después, en el servidor (src/admin/auth.ts) y en la base de datos (RLS).
 */
export async function proxy(request: NextRequest) {
  const project = request.nextUrl.pathname.match(/^\/proyectos\/([^/]+)\/?$/);
  if (project) {
    let slug = "";
    try {
      slug = decodeURIComponent(project[1]);
    } catch {
      /* dirección mal codificada: no existe */
    }
    const known = slug ? await isPublishedProject(slug) : false;
    // Dirección sin ruta → la 404 global («Escena eliminada en el montaje») con estado 404
    if (known === false) return NextResponse.rewrite(new URL("/_escena-eliminada", request.url), { status: 404 });
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, sessionCookieOptions(options, remember)));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/admin/acceso");

  if (!signedIn && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/acceso";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && pathname === "/admin/acceso") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  response.headers.set("x-robots-tag", "noindex, nofollow");
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/vista-previa/:path*", "/proyectos/:slug"],
};
