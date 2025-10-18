// PostgreSQL database setup - Reference: javascript_database blueprint
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Provide a default empty string to prevent import-time errors
// The actual validation happens in server/index.ts with better error handling
const connectionString = process.env.DATABASE_URL || '';

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
