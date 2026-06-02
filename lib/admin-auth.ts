export const ADMIN_SESSION_COOKIE = "oak_forge_admin_session";

function getSessionSecret(): string | null {
    const secret = process.env.ADMIN_SESSION_SECRET;
    return secret || null;
}

export function isAdminPasswordValid(password: string): boolean {
    const configured = process.env.ADMIN_PASSWORD;
    return Boolean(configured) && password === configured;
}

export function createAdminSessionToken(): string {
    const secret = getSessionSecret();
    if (!secret) {
        throw new Error("Missing ADMIN_SESSION_SECRET in environment variables.");
    }
    return secret;
}

export function verifyAdminSessionToken(token?: string | null): boolean {
    const secret = getSessionSecret();
    if (!token || !secret) return false;
    return token === secret;
}
