"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Plus, Trash2, ShoppingBasket, X, ChevronsUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CatalogItem, ShoppingListItem } from "@/lib/types";

const CATEGORIES = [
  "produce","dairy","meat","bakery","frozen","beverages","snacks",
  "household","personal_care","pharmacy","deli","seafood","canned_goods",
  "condiments","grains","alcohol","other",
];

const CATEGORY_COLORS: Record<string, string> = {
  produce: "bg-green-100 text-green-800", dairy: "bg-blue-100 text-blue-800",
  meat: "bg-red-100 text-red-800", bakery: "bg-amber-100 text-amber-800",
  frozen: "bg-cyan-100 text-cyan-800", beverages: "bg-purple-100 text-purple-800",
  snacks: "bg-orange-100 text-orange-800", household: "bg-gray-100 text-gray-800",
  condiments: "bg-yellow-100 text-yellow-800", grains: "bg-lime-100 text-lime-800",
  other: "bg-slate-100 text-slate-800",
};

function daysSince(dateStr?: string) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function ShoppingList() {
  const [list, setList] = useState<ShoppingListItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(() =>
    fetch("/api/shopping-list").then(r => r.json()).then(setList), []);
  const loadCatalog = useCallback(() =>
    fetch("/api/catalog").then(r => r.json()).then(setCatalog), []);

  useEffect(() => { loadList(); loadCatalog(); }, [loadList, loadCatalog]);

  const filtered = catalog.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatch = catalog.some(c => c.name.toLowerCase() === search.toLowerCase().trim());
  const showAddNew = search.trim().length > 0 && !exactMatch;

  const addItem = async (name: string, category: string) => {
    setAdding(true);
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, quantity: Number(qty) || 1, unit: unit.trim() || undefined }),
    });
    await loadList();
    await loadCatalog();
    setSearch(""); setQty("1"); setUnit(""); setOpen(false); setAdding(false);
  };

  const addNewItem = async () => {
    const name = search.trim();
    if (!name) return;
    // Add to catalog first
    await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category: selectedCategory }),
    });
    await addItem(name, selectedCategory);
  };

  const toggleCheck = async (item: ShoppingListItem) => {
    const newVal = item.is_checked ? 0 : 1;
    setList(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: newVal } : i));
    await fetch(`/api/shopping-list/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_checked: newVal }),
    });
    loadList();
  };

  const removeItem = async (id: number) => {
    setList(prev => prev.filter(i => i.id !== id));
    await fetch(`/api/shopping-list/${id}`, { method: "DELETE" });
  };

  const clearChecked = async () => {
    await fetch("/api/shopping-list", { method: "DELETE" });
    await loadList();
  };

  const unchecked = list.filter(i => !i.is_checked);
  const checked = list.filter(i => i.is_checked);

  return (
    <div className="space-y-4">
      {/* Combobox row */}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className="flex flex-1 items-center justify-between rounded-md border border-input bg-background px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors min-h-[44px]"
          >
            <span className="truncate text-gray-500">{search || "Search or add an item…"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
          </PopoverTrigger>
          <PopoverContent className="w-[min(92vw,360px)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                ref={inputRef}
                placeholder="Search items…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {filtered.length === 0 && !showAddNew && (
                  <CommandEmpty>No items found.</CommandEmpty>
                )}

                {showAddNew && (
                  <CommandGroup heading="New item">
                    <CommandItem
                      onSelect={addNewItem}
                      className="flex items-center gap-2 text-blue-600"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add &ldquo;{search.trim()}&rdquo;</span>
                      <span className="ml-auto text-xs text-gray-400">new</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {filtered.length > 0 && (
                  <CommandGroup heading="Your items">
                    {filtered.slice(0, 40).map(item => (
                      <CommandItem
                        key={item.id}
                        value={item.name}
                        onSelect={() => addItem(item.name, item.category)}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 opacity-0 group-data-[selected]:opacity-100" />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
                          {item.last_bought_at && (
                            <span>{daysSince(item.last_bought_at)}</span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other}`}>
                            {item.category}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>

            {/* Category picker shown only for new items */}
            {showAddNew && (
              <div className="border-t px-3 py-2 space-y-2">
                <p className="text-xs text-gray-500">Category for new item:</p>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors min-h-[32px] ${
                        selectedCategory === cat
                          ? "bg-blue-500 text-white"
                          : `${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other} hover:opacity-80`
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <input
          type="number"
          min="0.25"
          step="0.25"
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="w-14 text-center border rounded-md text-sm px-1 min-h-[44px]"
          title="Quantity"
        />
        <input
          type="text"
          placeholder="unit"
          value={unit}
          onChange={e => setUnit(e.target.value)}
          className="w-14 border rounded-md text-sm px-2 min-h-[44px]"
          title="Unit (optional)"
        />
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="text-center py-14 text-gray-400">
          <ShoppingBasket className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Your list is empty. Search above to add items.</p>
        </div>
      )}

      {/* Unchecked items */}
      {unchecked.length > 0 && (
        <div className="space-y-2">
          {unchecked.map(item => (
            <ListRow key={item.id} item={item} onToggle={toggleCheck} onRemove={removeItem} />
          ))}
        </div>
      )}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">In cart ({checked.length})</p>
            <button onClick={clearChecked} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
          {checked.map(item => (
            <ListRow key={item.id} item={item} onToggle={toggleCheck} onRemove={removeItem} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListRow({ item, onToggle, onRemove }: {
  item: ShoppingListItem;
  onToggle: (item: ShoppingListItem) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <Card className={`transition-opacity ${item.is_checked ? "opacity-50" : ""}`}>
      <CardContent className="py-3 px-3 flex items-center gap-3 min-h-[56px]">
        <Checkbox
          checked={!!item.is_checked}
          onCheckedChange={() => onToggle(item)}
          className="shrink-0 h-5 w-5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${item.is_checked ? "line-through text-gray-400" : "text-gray-900"}`}>
              {item.name}
            </span>
            {(item.quantity > 1 || item.unit) && (
              <span className="text-xs text-gray-400">
                {item.quantity}{item.unit ? ` ${item.unit}` : "×"}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded hidden sm:inline ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other}`}>
              {item.category}
            </span>
          </div>
          {item.last_bought_at && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              Last bought {daysSince(item.last_bought_at)}
              {item.last_bought_store ? ` · ${item.last_bought_store}` : ""}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 text-gray-300 hover:text-red-400 h-11 w-11"
          onClick={() => onRemove(item.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
