import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, sessionCookieOptions } from "@/lib/supabase/cookies";

/**
 * Proxy del panel (/admin y /vista-previa):
 *  - Renueva la sesión de Supabase en cada petición (cookies).
 *  - Sin sesión → al login, recordando a dónde iba.
 *  - Con sesión en el login → al panel.
 * El ROL se comprueba después, en el servidor (src/admin/auth.ts) y en la base de datos (RLS).
 */
export async function proxy(request: NextRequest) {
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
  matcher: ["/admin/:path*", "/vista-previa/:path*"],
};
