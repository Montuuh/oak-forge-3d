import { NextRequest, NextResponse } from "next/server";
import {
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken,
    isAdminPasswordValid,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const password = String(formData.get("password") || "");
    const next = String(formData.get("next") || "/admin");

    if (!isAdminPasswordValid(password)) {
        const url = new URL("/admin/login", request.url);
        url.searchParams.set("error", "invalid_credentials");
        if (next.startsWith("/")) {
            url.searchParams.set("next", next);
        }
        return NextResponse.redirect(url);
    }

    const redirectUrl = new URL(next.startsWith("/") ? next : "/admin", request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: createAdminSessionToken(),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    });

    return response;
}
