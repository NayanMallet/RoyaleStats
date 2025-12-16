import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || 'file:./prisma/data/database.sqlite',
});

export const prisma = new PrismaClient({ adapter });
export const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
