import { NextRequest, NextResponse } from "next/server";
import { updateShoppingListItem, deleteShoppingListItem } from "@/lib/queries";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  await updateShoppingListItem(Number(id), data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteShoppingListItem(Number(id));
  return NextResponse.json({ ok: true });
}
