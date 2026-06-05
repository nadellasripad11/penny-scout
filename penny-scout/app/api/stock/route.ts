import { NextResponse } from "next/server";
import { getStockHistory } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  const days = parseInt(searchParams.get("days") ?? "30");

  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    const history = await getStockHistory(ticker.toUpperCase(), days);
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
