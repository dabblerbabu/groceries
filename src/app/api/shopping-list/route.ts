import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getShoppingList, addShoppingListItem, clearCheckedItems, addCatalogItem } from "@/lib/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getShoppingList(userId));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, category = "other", quantity = 1, unit, note } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  // Ensure it exists in catalog too
  await addCatalogItem(name.trim(), category, userId);

  const id = await addShoppingListItem({ name: name.trim(), category, quantity, unit, note }, userId);
  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearCheckedItems(userId);
  return NextResponse.json({ ok: true });
}
