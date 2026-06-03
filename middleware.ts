import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

const ADMIN_LOGIN_PATH = "/admin/login";

const ADMIN_API_PUBLIC = ["/api/admin/login", "/api/admin/logout"];

function requiresAdminAuth(pathname: string): boolean {
    if (pathname.startsWith("/admin") && pathname !== ADMIN_LOGIN_PATH) {
        return true;
    }
    if (pathname.startsWith("/api/admin")) {
        return !ADMIN_API_PUBLIC.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    }
    return false;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!requiresAdminAuth(pathname)) {
        return NextResponse.next();
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const isValid = verifyAdminSessionToken(token);

    if (!isValid) {
        if (pathname.startsWith("/api/admin")) {
            return NextResponse.json({ error: "No autorizado." }, { status: 401 });
        }
        const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
