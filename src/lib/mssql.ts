import sql from "mssql";

const config: sql.config = {
  server: process.env.MSSQL_HOST!,
  database: process.env.MSSQL_DB!,
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

let pool: sql.ConnectionPool | null = null;

export async function getMSSQLPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    console.log("[mssql] Reusing existing connection pool");
    return pool;
  }
  console.log(`[mssql] Connecting to MSSQL server=${process.env.MSSQL_HOST} db=${process.env.MSSQL_DB}`);
  pool = await new sql.ConnectionPool(config).connect();
  console.log("[mssql] Connected to MSSQL");
  return pool;
}
