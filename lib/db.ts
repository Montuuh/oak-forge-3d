import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

export const db =
    global.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || '' }),
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    global.prisma = db;
}
