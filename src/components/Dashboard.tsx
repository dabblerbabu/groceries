"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import type { StoreSpending, CategorySpending, MonthlySpending, TopItem, SpendingStats } from "@/lib/types";
import { ShoppingCart, DollarSign, Store, Tag } from "lucide-react";

interface StatsData {
  summary: SpendingStats;
  byStore: StoreSpending[];
  byCategory: CategorySpending[];
  byMonth: MonthlySpending[];
  topItems: TopItem[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const fmt = (n: number | undefined) => n != null ? `$${n.toFixed(2)}` : "";

// Truncate long store names for the YAxis
const truncate = (s: string, max = 14) => s.length > max ? s.slice(0, max) + "…" : s;

function StatCard({ icon: Icon, title, value, sub }: { icon: React.ElementType; title: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3 px-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-1.5 rounded-lg shrink-0">
            <Icon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-base font-bold text-gray-900 truncate">{value}</p>
            {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-center py-12 text-gray-400">Loading analytics…</div>;

  const { summary, byStore, byCategory, byMonth, topItems } = data;

  if (summary.receiptCount === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">No data yet</p>
        <p className="text-sm mt-1">Upload some receipts to see your spending patterns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat cards — 2-col on all sizes */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} title="Total spent" value={fmt(summary.totalSpent)} />
        <StatCard icon={ShoppingCart} title="Trips" value={String(summary.receiptCount)} sub={`avg ${fmt(summary.avgPerTrip)}/trip`} />
        <StatCard icon={Store} title="Fav store" value={summary.topStore} />
        <StatCard icon={Tag} title="Top category" value={summary.topCategory} />
      </div>

      {/* Monthly trend */}
      {byMonth.length > 1 && (
        <Card>
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pt-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={byMonth} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} width={45} />
                <Tooltip formatter={
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (v: any) => fmt(v as number)} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Store + Category — stack on mobile, side-by-side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byStore.length > 0 && (
          <Card>
            <CardHeader className="pb-0 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">By Store</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pt-2 pb-3">
              <ResponsiveContainer width="100%" height={Math.max(120, byStore.length * 36)}>
                <BarChart data={byStore} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis
                    type="category"
                    dataKey="store"
                    tick={{ fontSize: 10 }}
                    width={80}
                    tickFormatter={(v) => truncate(v, 12)}
                  />
                  <Tooltip
                    formatter={
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (v: any) => fmt(v as number)}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byCategory.length > 0 && (
          <Card>
            <CardHeader className="pb-0 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">By Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {/* Pie without labels — legend list below is more readable on mobile */}
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={byCategory} dataKey="total" nameKey="category"
                    cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (v: any) => fmt(v as number)} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
                {byCategory.map((c, i) => (
                  <div key={c.category} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }} />
                    {c.category}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top items */}
      {topItems.length > 0 && (
        <Card>
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Most Purchased</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2 pb-3">
            <div className="space-y-2.5">
              {topItems.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                  <span className="font-medium text-gray-800 truncate flex-1 capitalize">{item.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline">
                    {item.category}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">{item.count}×</span>
                  <span className="font-mono text-xs text-gray-700 shrink-0">{fmt(item.total_spent)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
