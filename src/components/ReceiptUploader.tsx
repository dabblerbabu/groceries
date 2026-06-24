"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ParsedReceipt } from "@/lib/types";

interface Props {
  onSuccess: () => void;
}

export function ReceiptUploader({ onSuccess }: Props) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setStatus("uploading");
    setError(null);
    setParsed(null);
    const form = new FormData();
    form.append("receipt", file);
    try {
      const res = await fetch("/api/receipts", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Upload failed");
      }
      const data = await res.json();
      setParsed(data.parsed);
      setStatus("success");
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, [onSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("receipt-input")?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          {status === "uploading" ? (
            <>
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Reading receipt with Claude...</p>
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="text-sm text-green-600 font-medium">Receipt saved!</p>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}>
                Upload another
              </Button>
            </>
          ) : status === "error" ? (
            <>
              <XCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}>
                Try again
              </Button>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <div>
                <p className="font-medium text-gray-700">Drop a receipt image here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse — JPG, PNG, WEBP</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <input id="receipt-input" type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {status === "success" && parsed && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{parsed.store_name} — {parsed.date}</h3>
            <div className="text-sm text-gray-600 space-y-1 max-h-48 overflow-y-auto">
              {parsed.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.name} {item.quantity && item.quantity > 1 ? `×${item.quantity}` : ""}</span>
                  <span className="font-mono">${item.total_price.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">${parsed.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
