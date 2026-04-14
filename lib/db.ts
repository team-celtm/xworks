import { Pool, QueryResult, QueryResultRow } from "pg";

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
// @ts-ignore
pool.query = async function (text: any, params: any): Promise<any> {
  const maxRetries = 10;
  const delay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await originalQuery(text, params);
    } catch (err: any) {
      if (err.code === '57P03' && i < maxRetries - 1) {
        console.log(`[DB] System is starting up. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
} as any;

export default pool;


