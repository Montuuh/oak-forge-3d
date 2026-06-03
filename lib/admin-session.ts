import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

export function getAdminSessionToken(request: NextRequest): string | undefined {
    return request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
}

export function isAdminRequest(request: NextRequest): boolean {
    return verifyAdminSessionToken(getAdminSessionToken(request));
}

export function assertAdminRequest(request: NextRequest): void {
    if (!isAdminRequest(request)) {
        throw new AdminUnauthorizedError();
    }
}

export class AdminUnauthorizedError extends Error {
    constructor() {
        super("Unauthorized");
        this.name = "AdminUnauthorizedError";
    }
}
