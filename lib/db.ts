import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL no esta configurada en .env.local");
    }
    return new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
}

export const db = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = db;
}
