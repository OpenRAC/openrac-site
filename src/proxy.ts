import { NextResponse, type NextRequest } from "next/server";

/**
 * An address with a broken %-escape (say /mods/%E0%A4%A) cannot be decoded into a page's params, and
 * would end as a server error. It gets the site's own "not found" page instead.
 */
export function proxy(req: NextRequest) {
  try {
    decodeURIComponent(req.nextUrl.pathname);
    return NextResponse.next();
  } catch {
    return NextResponse.rewrite(new URL("/not-found-address", req.url), { status: 404 });
  }
}

// Only paths with a "%" in them can be broken this way; static files never get here.
export const config = { matcher: ["/((?!_next/|img/|favicon).*%.*)"] };
