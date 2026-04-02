import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("connect",()=>{
  console.log("Connected to database");
})
pool.on("error",(err)=>{
  console.log("Error connecting to database",err);
})
export default pool;
