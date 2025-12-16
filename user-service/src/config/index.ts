import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL || 'file:./prisma/data/database.sqlite';
const adapter = new PrismaBetterSqlite3({ url: connectionString });

export const prisma = new PrismaClient({ adapter });
export const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
