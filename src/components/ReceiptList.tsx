"use client";

import { useState } from "react";
import { Trash2, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Receipt as ReceiptType, Item } from "@/lib/types";

interface Props {
  receipts: ReceiptType[];
  onDelete: (id: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  produce: "bg-green-100 text-green-800",
  dairy: "bg-blue-100 text-blue-800",
  meat: "bg-red-100 text-red-800",
  bakery: "bg-amber-100 text-amber-800",
  frozen: "bg-cyan-100 text-cyan-800",
  beverages: "bg-purple-100 text-purple-800",
  snacks: "bg-orange-100 text-orange-800",
  household: "bg-gray-100 text-gray-800",
  personal_care: "bg-pink-100 text-pink-800",
  other: "bg-slate-100 text-slate-800",
};

function ItemsList({ receiptId }: { receiptId: number }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const toggle = async () => {
    if (!open && !items) {
      setLoading(true);
      const res = await fetch(`/api/receipts/${receiptId}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setLoading(false);
    }
    setOpen((v) => !v);
  };

  return (
    <div>
      <button onClick={toggle} className="text-xs text-blue-600 flex items-center gap-1 mt-1 py-1 pr-2 -ml-0.5">
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {open ? "Hide items" : "Show items"}
      </button>
      {open && (
        <div className="mt-2 text-sm space-y-2">
          {loading && <p className="text-gray-400 text-xs">Loading...</p>}
          {items?.map((item) => {
            const byWeight = item.unit_price != null && item.quantity !== 1;
            return (
              <div key={item.id} className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-gray-700">{item.name}</span>
                  {byWeight && (
                    <span className="text-xs text-gray-400 ml-1.5 whitespace-nowrap">
                      {item.quantity} lb × ${item.unit_price!.toFixed(2)}/lb
                    </span>
                  )}
                  {!byWeight && item.quantity > 1 && (
                    <span className="text-xs text-gray-400 ml-1.5">×{item.quantity}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded hidden sm:inline ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other}`}>
                    {item.category}
                  </span>
                  <span className="font-mono text-gray-600 text-xs">${item.total_price.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReceiptList({ receipts, onDelete }: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this receipt?")) return;
    setDeleting(id);
    await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    onDelete(id);
    setDeleting(null);
  };

  if (receipts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No receipts yet. Upload one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {receipts.map((r) => (
        <Card key={r.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{r.store_name ?? "Unknown store"}</span>
                  <Badge variant="outline" className="text-xs">{r.date}</Badge>
                </div>
                <ItemsList receiptId={r.id} />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-mono font-semibold text-gray-800">${r.total.toFixed(2)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500 h-11 w-11"
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
