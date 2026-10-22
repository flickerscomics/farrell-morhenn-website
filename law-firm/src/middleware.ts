import { NextResponse, type NextRequest } from "next/server";

// Fast, optimistic redirect for visitors without a session cookie. This is a
// convenience only: every protected page and server action re-checks the
// session and permissions on the server.

const STAFF_PUBLIC = ["/admin/login", "/admin/reset-password"];
const CLIENT_PUBLIC = ["/portal/login", "/portal/register", "/portal/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);

  if (pathname.startsWith("/admin") && !STAFF_PUBLIC.some((p) => pathname.startsWith(p))) {
    if (!request.cookies.get("cw_staff")) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/portal") && !CLIENT_PUBLIC.some((p) => pathname.startsWith(p))) {
    if (!request.cookies.get("cw_client")) {
      const url = new URL("/portal/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
