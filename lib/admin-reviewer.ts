export function getAdminReviewerName(): string {
    const name = process.env.ADMIN_REVIEWER_NAME?.trim();
    if (!name) {
        throw new Error("Missing ADMIN_REVIEWER_NAME in environment variables.");
    }
    return name;
}
