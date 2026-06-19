import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { Company } from "@/models/MasterData";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const stocks = await Company.find({}, { name: 1, sector: 1, _id: 0 })
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(
    stocks.map((s) => ({ StockName: s.name, sect_name: s.sector ?? "" }))
  );
}
