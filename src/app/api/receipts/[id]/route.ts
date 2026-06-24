import { NextRequest, NextResponse } from "next/server";
import { getReceiptWithItems, deleteReceipt } from "@/lib/queries";
import { storage } from "@/lib/storage";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceiptWithItems(Number(id));
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(receipt);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Look up the image before deleting so we can clean up its stored object.
  const receipt = await getReceiptWithItems(Number(id));
  await deleteReceipt(Number(id));
  if (receipt?.image_path) await storage.remove(receipt.image_path);
  return NextResponse.json({ ok: true });
}
