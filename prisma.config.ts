import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });
dotenv.config();

/** prisma generate does not connect; placeholder for CI/Vercel when DATABASE_URL is unset at install time. */
const PLACEHOLDER_DATABASE_URL =
    "postgresql://build:build@127.0.0.1:5432/build?schema=public";

function resolveDatabaseUrl(): string {
    const url = process.env.DATABASE_URL?.trim();
    return url || PLACEHOLDER_DATABASE_URL;
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: resolveDatabaseUrl(),
    },
});
