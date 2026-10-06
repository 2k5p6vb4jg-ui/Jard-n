import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, isValidSession, SESSION_COOKIE } from "@/lib/auth";

/**
 * Si hay PIN configurado, toda la app (páginas, acciones y API) exige sesión.
 * Sin PIN, la app queda abierta a la red local (se avisa en Ajustes).
 */
export async function proxy(req: NextRequest) {
  const cfg = await getAuthConfig();
  if (!cfg.pinHash) return NextResponse.next();
  if (isValidSession(req.cookies.get(SESSION_COOKIE)?.value, cfg)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sesión caducada. Vuelva a introducir el PIN." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/acceso";
  url.search = "";
  const back = req.nextUrl.pathname + req.nextUrl.search;
  if (back !== "/") url.searchParams.set("volver", back);
  return NextResponse.redirect(url);
}

export const config = {
  // Todo salvo la pantalla de acceso, los recursos estáticos y el logo (se muestra en el acceso)
  matcher: ["/((?!acceso|_next/static|_next/image|favicon\\.ico|api/logo).*)"],
};
