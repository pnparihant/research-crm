import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Company } from "@/models/MasterData";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  console.log("[mssql/stocks] GET — fetching stock list");
  const session = await auth();
  if (!session?.user) {
    console.log("[mssql/stocks] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const stocks = await Company.find({}, { name: 1, sector: 1, _id: 0 })
    .sort({ name: 1 })
    .lean();

  console.log(`[mssql/stocks] GET — returned ${stocks.length} stocks to user=${session.user.email}`);
  return NextResponse.json(
    stocks.map((s) => ({ StockName: s.name, sect_name: s.sector ?? "" }))
  );
}
