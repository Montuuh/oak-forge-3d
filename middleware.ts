import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

const ADMIN_LOGIN_PATH = "/admin/login";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!pathname.startsWith("/admin")) {
        return NextResponse.next();
    }

    if (pathname === ADMIN_LOGIN_PATH) {
        return NextResponse.next();
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const isValid = verifyAdminSessionToken(token);

    if (!isValid) {
        const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
