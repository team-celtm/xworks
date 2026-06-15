import { Pool, QueryResult, QueryResultRow, QueryConfig } from "pg";
import './secrets';

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("Connected to database");
});

pool.on("error", (err) => {
  console.error("Error connecting to database", err);
});

// Store the original query function
const originalQuery = pool.query.bind(pool);

// Monkey-patch pool.query to be resilient to 57P03 (DB starting up)
// @ts-expect-error - Overriding read-only property for monkey-patching
pool.query = (async function <R extends QueryResultRow = QueryResultRow, I extends unknown[] = unknown[]>(
  text: string | QueryConfig<I>,
  params?: I
): Promise<QueryResult<R>> {
  const maxRetries = 10;
  const delay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await (originalQuery as (t: typeof text, p?: typeof params) => Promise<QueryResult<R>>)(text, params);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr && pgErr.code === '57P03' && i < maxRetries - 1) {
        console.log(`[DB] System is starting up. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Database query failed after max retries.");
} as unknown);

export default pool;


