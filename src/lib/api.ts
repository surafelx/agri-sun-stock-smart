const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const TOKEN_KEY = 'agrisun_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Normalize a MongoDB document: _id → id, camelCase → snake_case for known fields
export function normalizeItem(item: any): any {
  if (!item) return item;
  return {
    ...item,
    id: item._id || item.id,
    category_id: item.category?._id || item.category?.$oid || item.category_id || null,
    subcategory_id: item.subcategory?._id || item.subcategory?.$oid || item.subcategory_id || null,
    categories: item.category ? { name: item.category.name, id: item.category._id || item.category.id } : null,
    subcategories: item.subcategory ? { name: item.subcategory.name, id: item.subcategory._id || item.subcategory.id } : null,
    cost_price: item.costPrice ?? item.cost_price ?? 0,
    unit_price: item.unitPrice ?? item.unit_price ?? 0,
    low_stock_threshold: item.lowStockThreshold ?? item.low_stock_threshold ?? 10,
    created_at: item.createdAt || item.created_at,
    updated_at: item.updatedAt || item.updated_at,
  };
}

export function normalizeTransaction(txn: any): any {
  if (!txn) return txn;
  return {
    ...txn,
    id: txn._id || txn.id,
    transaction_type: txn.transactionType || txn.transaction_type,
    transaction_date: txn.transactionDate || txn.transaction_date,
    reference_number: txn.referenceNumber || txn.reference_number,
    customer_supplier_name: txn.customerSupplierName || txn.customer_supplier_name,
    customer_supplier_contact: txn.customerSupplierContact ?? txn.customer_supplier_contact ?? null,
    tin_no: txn.tinNo ?? txn.tin_no ?? null,
    total_amount: txn.totalAmount ?? txn.total_amount ?? 0,
    notes: txn.notes ?? null,
    created_at: txn.createdAt || txn.created_at,
    // Normalize line items if present
    items: txn.items?.map((li: any) => ({
      ...li,
      id: li._id || li.id,
      item_id: li.item?._id || li.item?.id || li.item_id,
      unit_price: li.unitPrice ?? li.unit_price ?? 0,
      total_price: li.totalPrice ?? li.total_price ?? 0,
      profit: li.profit ?? 0,
      items: li.item ? { name: li.item.name, sku: li.item.sku, id: li.item._id || li.item.id, category_id: li.item.category?._id || li.item.category || null, subcategory_id: li.item.subcategory?._id || li.item.subcategory || null } : null,
    })),
  };
}

export function normalizeCategory(cat: any): any {
  if (!cat) return cat;
  return { ...cat, id: cat._id || cat.id, created_at: cat.createdAt || cat.created_at };
}

export function normalizeSubcategory(sub: any): any {
  if (!sub) return sub;
  return {
    ...sub,
    id: sub._id || sub.id,
    category_id: sub.category?._id || sub.category?.id || sub.category_id,
    categories: sub.category ? { name: sub.category.name } : null,
    created_at: sub.createdAt || sub.created_at,
  };
}

export function normalizeUser(user: any): any {
  if (!user) return user;
  return {
    ...user,
    id: user._id || user.id,
    full_name: user.fullName || user.full_name,
    is_active: user.isActive ?? user.is_active ?? true,
    created_at: user.createdAt || user.created_at,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    removeToken();
    window.location.href = '/auth';
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data as T;
}

async function requestRaw(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (body: { fullName: string; email: string; password: string; role?: string }) =>
    request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request<{ user: any }>('/auth/me'),

  updateMe: (body: { fullName?: string; email?: string }) =>
    request<{ user: any }>('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = {
  list: (params?: Record<string, string>) =>
    request<{ users: any[]; total: number }>('/users?' + new URLSearchParams(params || {}).toString()),

  get: (id: string) => request<{ user: any }>(`/users/${id}`),

  create: (body: { fullName: string; email: string; password: string; role: string }) =>
    request<{ user: any }>('/users', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: Partial<{ fullName: string; email: string; role: string; isActive: boolean }>) =>
    request<{ user: any }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),

  resetPassword: (id: string, newPassword: string) =>
    request(`/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
};

// ── Categories ────────────────────────────────────────────────────────────────
export const categories = {
  list: () => request<{ categories: any[] }>('/categories'),

  create: (name: string) =>
    request<{ category: any }>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  update: (id: string, name: string) =>
    request<{ category: any }>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),

  delete: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

  listSubcategories: (categoryId: string) =>
    request<{ subcategories: any[] }>(`/categories/${categoryId}/subcategories`),

  createSubcategory: (categoryId: string, name: string) =>
    request<{ subcategory: any }>(`/categories/${categoryId}/subcategories`, {
      method: 'POST', body: JSON.stringify({ name }),
    }),

  updateSubcategory: (categoryId: string, id: string, name: string) =>
    request<{ subcategory: any }>(`/categories/${categoryId}/subcategories/${id}`, {
      method: 'PUT', body: JSON.stringify({ name }),
    }),

  deleteSubcategory: (categoryId: string, id: string) =>
    request(`/categories/${categoryId}/subcategories/${id}`, { method: 'DELETE' }),
};

// ── Items ─────────────────────────────────────────────────────────────────────
export const items = {
  list: (params?: Record<string, string>) =>
    request<{ items: any[]; total: number }>('/items?' + new URLSearchParams(params || {}).toString()),

  lowStock: () => request<{ items: any[] }>('/items/low-stock'),

  get: (id: string) => request<{ item: any }>(`/items/${id}`),

  stockCard: (id: string) =>
    request<{ item: any; movements: any[]; currentBalance: number }>(`/items/${id}/stock-card`),

  create: (body: any) =>
    request<{ item: any }>('/items', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: any) =>
    request<{ item: any }>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: string) => request(`/items/${id}`, { method: 'DELETE' }),

  import: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await requestRaw('/items/import', { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Import failed');
    return data;
  },
};

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactions = {
  list: (params?: Record<string, string>) =>
    request<{ transactions: any[]; total: number }>('/transactions?' + new URLSearchParams(params || {}).toString()),

  get: (id: string) => request<{ transaction: any }>(`/transactions/${id}`),

  create: (body: any) =>
    request<{ transaction: any }>('/transactions', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: any) =>
    request<{ transaction: any }>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: string) => request(`/transactions/${id}`, { method: 'DELETE' }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  stats: () => request<any>('/dashboard/stats'),
  chartTransactions: () => request<{ chartData: any[] }>('/dashboard/charts/transactions'),
  chartTopItems: (days?: number) =>
    request<{ items: any[] }>(`/dashboard/charts/top-items${days ? `?days=${days}` : ''}`),
  chartStockByCategory: () => request<{ data: any[] }>('/dashboard/charts/stock-by-category'),
};

// ── Stock Balance ─────────────────────────────────────────────────────────────
export const stockBalance = {
  list: (params?: Record<string, string>) =>
    request<{ balances: any[]; total: number }>('/stock-balance?' + new URLSearchParams(params || {}).toString()),

  get: (itemId: string) => request<{ item: any; summary: any }>(`/stock-balance/${itemId}`),

  recalculate: () => request<{ message: string; updated: number }>('/stock-balance/recalculate', { method: 'POST' }),
};

// ── Activity Log ──────────────────────────────────────────────────────────────
export const activityLog = {
  list: (params?: Record<string, string>) =>
    request<{ logs: any[]; total: number }>('/activity-log?' + new URLSearchParams(params || {}).toString()),
};

// ── Suppliers ───────────────────────────────────────────────────────────────
export const suppliers = {
  list: (params?: Record<string, string>) =>
    request<{ suppliers: any[]; total: number }>('/suppliers?' + new URLSearchParams(params || {}).toString()),

  get: (id: string) => request<{ supplier: any }>(`/suppliers/${id}`),

  create: (body: { name: string; tin_no?: string; contact?: string; address?: string; notes?: string }) =>
    request<{ supplier: any }>('/suppliers', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: Partial<{ name: string; tin_no: string; contact: string; address: string; notes: string; is_active: boolean }>) =>
    request<{ supplier: any }>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),
};
