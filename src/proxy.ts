import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, SESSION_COOKIE, sessionUser } from "@/lib/auth";
import { canAccessPath } from "@/lib/permissions";

/**
 * Si hay usuarios, toda la app (páginas, acciones y API) exige sesión, y cada perfil
 * solo entra en sus secciones. Sin usuarios, la app queda abierta a la red local (se avisa en Ajustes).
 */
export async function proxy(req: NextRequest) {
  const cfg = await getAuthConfig();
  if (!cfg.enabled) return NextResponse.next();
  const user = sessionUser(req.cookies.get(SESSION_COOKIE)?.value, cfg);
  const { pathname } = req.nextUrl;
  const api = pathname.startsWith("/api/");

  if (!user) {
    if (api) return NextResponse.json({ error: "Sesión caducada. Vuelva a introducir el PIN." }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/acceso";
    url.search = "";
    const back = pathname + req.nextUrl.search;
    if (back !== "/") url.searchParams.set("volver", back);
    return NextResponse.redirect(url);
  }

  if (!canAccessPath(user.role, pathname)) {
    if (api) return NextResponse.json({ error: "Su usuario no tiene permiso." }, { status: 403 });
    const url = req.nextUrl.clone();
    url.pathname = "/sin-permiso";
    url.search = "";
    return NextResponse.rewrite(url, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  // Todo salvo la pantalla de acceso, los recursos estáticos y el logo (se muestra en el acceso)
  matcher: ["/((?!acceso|_next/static|_next/image|favicon\\.ico|api/logo|api/icono|manifest\\.webmanifest|sw\\.js|offline\\.html).*)"],
};
