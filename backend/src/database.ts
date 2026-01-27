import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './types/database';

// Database connection - lazy loaded
let db: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

export function getDatabase() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      client = postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });

      db = drizzle(client, { schema });
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw new Error('Database connection failed');
    }
  }

  return db;
}

// Export for testing/cleanup
export { client };