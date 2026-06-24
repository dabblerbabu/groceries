import { NextRequest, NextResponse } from "next/server";
import { getShoppingList, addShoppingListItem, clearCheckedItems, addCatalogItem } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await getShoppingList());
}

export async function POST(req: NextRequest) {
  const { name, category = "other", quantity = 1, unit, note } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  // Ensure it exists in catalog too
  await addCatalogItem(name.trim(), category);

  const id = await addShoppingListItem({ name: name.trim(), category, quantity, unit, note });
  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE() {
  await clearCheckedItems();
  return NextResponse.json({ ok: true });
}
