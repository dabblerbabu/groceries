import { NextResponse } from "next/server";
import { getSpendingStats, getStoreSpending, getCategorySpending, getMonthlySpending, getTopItems } from "@/lib/queries";

export async function GET() {
  const [summary, byStore, byCategory, byMonth, topItems] = await Promise.all([
    getSpendingStats(),
    getStoreSpending(),
    getCategorySpending(),
    getMonthlySpending(),
    getTopItems(20),
  ]);
  return NextResponse.json({ summary, byStore, byCategory, byMonth, topItems });
}
