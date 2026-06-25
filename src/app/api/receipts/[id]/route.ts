import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getReceiptWithItems, deleteReceipt } from "@/lib/queries";
import { storage } from "@/lib/storage";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const receipt = await getReceiptWithItems(Number(id), userId);
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(receipt);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // Only fetches if owned by this user; prevents deleting/cleaning up others' receipts.
  const receipt = await getReceiptWithItems(Number(id), userId);
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteReceipt(Number(id), userId);
  if (receipt.image_path) await storage.remove(receipt.image_path);
  return NextResponse.json({ ok: true });
}
