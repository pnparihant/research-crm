import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getMSSQLPool } from "@/lib/mssql";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const pool = await getMSSQLPool();
    const result = await pool.request().query(
      "SELECT StockName, sect_name FROM commondb.dbo.tbl_stockmaster ORDER BY StockName"
    );
    return NextResponse.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "MSSQL query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
