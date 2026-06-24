"use client";

import { useState, useEffect, useCallback } from "react";
import { ReceiptUploader } from "@/components/ReceiptUploader";
import { ReceiptList } from "@/components/ReceiptList";
import { Dashboard } from "@/components/Dashboard";
import { ShoppingList } from "@/components/ShoppingList";
import { ShoppingCart, Upload, FileText, ListChecks, BarChart2 } from "lucide-react";
import type { Receipt } from "@/lib/types";

const TABS = [
  { id: "upload",   label: "Upload",   Icon: Upload     },
  { id: "receipts", label: "Receipts", Icon: FileText   },
  { id: "list",     label: "List",     Icon: ListChecks },
  { id: "insights", label: "Insights", Icon: BarChart2  },
] as const;

type TabId = typeof TABS[number]["id"];

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("upload");

  const loadReceipts = useCallback(async () => {
    const res = await fetch("/api/receipts");
    const data = await res.json();
    setReceipts(data);
  }, []);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);

  const handleUploadSuccess = () => {
    loadReceipts();
    setTimeout(() => setActiveTab("receipts"), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <ShoppingCart style={{ width: 20, height: 20, color: "#2563eb", flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>Receipt Tracker</span>
        {receipts.length > 0 && (
          <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999, marginLeft: "auto" }}>
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tab bar — plain block, no positioning tricks */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb", display: "flex" }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "10px 4px",
              fontSize: 11,
              fontWeight: 500,
              border: "none",
              borderBottom: `3px solid ${activeTab === id ? "#2563eb" : "transparent"}`,
              background: "transparent",
              color: activeTab === id ? "#2563eb" : "#6b7280",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Icon style={{ width: 20, height: 20 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 672, margin: "0 auto", padding: "16px 12px 40px" }}>
        {activeTab === "upload"   && <ReceiptUploader onSuccess={handleUploadSuccess} />}
        {activeTab === "receipts" && <ReceiptList receipts={receipts} onDelete={(id) => setReceipts(p => p.filter(r => r.id !== id))} />}
        {activeTab === "list"     && <ShoppingList />}
        {activeTab === "insights" && <Dashboard />}
      </div>

    </div>
  );
}
