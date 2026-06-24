export interface Store {
  id: number;
  name: string;
  address?: string;
  created_at: string;
}

export interface Receipt {
  id: number;
  store_id?: number;
  store_name?: string;
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  image_path?: string;
  notes?: string;
  created_at: string;
  items?: Item[];
}

export interface Item {
  id: number;
  receipt_id: number;
  name: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
  category: string;
}

export interface ParsedReceipt {
  store_name: string;
  store_address?: string;
  date: string;
  subtotal?: number;
  tax?: number;
  total: number;
  items: {
    name: string;
    quantity?: number;
    unit_price?: number;
    total_price: number;
    category?: string;
  }[];
}

export interface SpendingStats {
  totalSpent: number;
  receiptCount: number;
  avgPerTrip: number;
  topStore: string;
  topCategory: string;
}

export interface StoreSpending {
  store: string;
  total: number;
  visits: number;
}

export interface CategorySpending {
  category: string;
  total: number;
  count: number;
}

export interface MonthlySpending {
  month: string;
  total: number;
}

export interface TopItem {
  name: string;
  category: string;
  count: number;
  total_spent: number;
  avg_price: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  category: string;
  is_custom: number;
  created_at: string;
  last_bought_at?: string;      // most recent receipt date this item appeared on
  last_bought_store?: string;   // store name for that purchase
  buy_count?: number;           // total times purchased
}

export interface ShoppingListItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  note?: string;
  is_checked: number;
  added_at: string;
  checked_at?: string;
  last_bought_at?: string;
  last_bought_store?: string;
}
