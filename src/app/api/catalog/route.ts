import { NextRequest, NextResponse } from "next/server";
import { getCatalog, addCatalogItem } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await getCatalog());
}

export async function POST(req: NextRequest) {
  const { name, category = "other" } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const id = await addCatalogItem(name.trim(), category);
  return NextResponse.json({ id }, { status: 201 });
}
