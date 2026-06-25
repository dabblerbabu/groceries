import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSpendingStats, getStoreSpending, getCategorySpending, getMonthlySpending, getTopItems } from "@/lib/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [summary, byStore, byCategory, byMonth, topItems] = await Promise.all([
    getSpendingStats(userId),
    getStoreSpending(userId),
    getCategorySpending(userId),
    getMonthlySpending(userId),
    getTopItems(userId, 20),
  ]);
  return NextResponse.json({ summary, byStore, byCategory, byMonth, topItems });
}
