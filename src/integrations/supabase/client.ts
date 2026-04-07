// Supabase client with full localStorage fallback for offline/demo mode
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// --- LocalStorage Mock (complete Supabase-compatible API surface) ---
type AuthCallback = (event: string, session: any) => void;

class LocalMock {
  private readonly DB_KEY = 'grocify_db';
  private readonly SESSION_KEY = 'grocify_session';
  private listeners: AuthCallback[] = [];
  private createId() {
    return globalThis.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2, 11)}`;
  }

  private createDefaultDb() {
    return { products: [], invoices: [], profiles: [] };
  }

  private getDb() {
    const fallback = this.createDefaultDb();
    try {
      const raw = localStorage.getItem(this.DB_KEY);
      const parsed = raw ? JSON.parse(raw) : fallback;
      return {
        products: Array.isArray(parsed?.products) ? parsed.products : [],
        invoices: Array.isArray(parsed?.invoices) ? parsed.invoices : [],
        profiles: Array.isArray(parsed?.profiles) ? parsed.profiles : [],
      };
    } catch {
      return fallback;
    }
  }

  private saveDb(db: any) {
    localStorage.setItem(this.DB_KEY, JSON.stringify(db));
  }

  private notifyListeners(event: string) {
    const sessionStr = localStorage.getItem(this.SESSION_KEY);
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    this.listeners.forEach(cb => cb(event, session));
  }

  private ensureProfileExists(user: { id: string; email?: string | null }) {
    const db = this.getDb();
    const existing = db.profiles.find((p: any) => p.user_id === user.id);
    if (!existing) {
      db.profiles.push({
        id: this.createId(),
        user_id: user.id,
        email: user.email || null,
        business_type: null,
        is_onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      this.saveDb(db);
    }
  }

  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      const isDemoUser = normalizedEmail === 'demo' || normalizedEmail === 'demo@grocify.local';

      if (isDemoUser && normalizedPassword === 'passwd') {
        const user = { id: 'demo-id', email: 'demo@grocify.local' };
        const session = { user };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        // Keep demo user ready-to-use out of the box.
        const db = this.getDb();
        const existing = db.profiles.find((p: any) => p.user_id === 'demo-id');
        if (!existing) {
          db.profiles.push({
            id: this.createId(),
            user_id: 'demo-id',
            email: 'demo@grocify.local',
            business_type: 'Grocery',
            is_onboarded: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          this.saveDb(db);
        }
        this.notifyListeners('SIGNED_IN');
        return { data: { user, session }, error: null };
      }
      return { data: { user: null, session: null }, error: new Error("Invalid credentials") };
    },

    signUp: async ({ email }: { email: string; password: string; options?: any }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const userId = normalizedEmail
        ? `local-${normalizedEmail.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user"}`
        : this.createId();
      const user = { id: userId, email: normalizedEmail || email };
      const session = { user };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      this.ensureProfileExists(user);
      this.notifyListeners('SIGNED_IN');
      return { data: { user, session }, error: null };
    },

    onAuthStateChange: (cb: AuthCallback) => {
      this.listeners.push(cb);
      // Fire immediately with current state
      const sessionStr = localStorage.getItem(this.SESSION_KEY);
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      setTimeout(() => cb('INITIAL_SESSION', session), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners = this.listeners.filter(l => l !== cb);
            }
          }
        }
      };
    },

    getSession: async () => {
      const sessionStr = localStorage.getItem(this.SESSION_KEY);
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      if (session?.user?.id) {
        this.ensureProfileExists(session.user);
      }
      return { data: { session }, error: null };
    },

    signOut: async () => {
      localStorage.removeItem(this.SESSION_KEY);
      this.notifyListeners('SIGNED_OUT');
      return { error: null };
    }
  };

  from(table: string) {
    const self = this;
    let currentFilter: Record<string, any> = {};
    let isSingle = false;
    let orderBy: { column: string; ascending: boolean } | null = null;

    const sortRows = (rows: any[]) => {
      if (!orderBy) return rows;
      const { column, ascending } = orderBy;
      const sorted = [...rows].sort((a, b) => {
        const av = a?.[column];
        const bv = b?.[column];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      });
      return ascending ? sorted : sorted.reverse();
    };

    const chain: any = {
      select: (_cols?: string) => chain,
      eq: (key: string, val: any) => { currentFilter[key] = val; return chain; },
      order: (col: string, options?: { ascending?: boolean }) => {
        orderBy = { column: col, ascending: options?.ascending !== false };
        return chain;
      },
      single: () => { isSingle = true; return chain; },

      insert: async (data: any) => {
        const db = self.getDb();
        if (!db[table]) db[table] = [];
        const items = Array.isArray(data) ? data : [data];

        if (table === "products") {
          for (const item of items) {
            const duplicate = db.products.find(
              (p: any) => p.user_id === item.user_id && p.sku === item.sku
            );
            if (duplicate) {
              return { data: null, error: new Error("duplicate key value violates unique constraint \"products_user_id_sku_key\"") };
            }
          }
        }

        const now = new Date().toISOString();
        const newItems = items.map(item => {
          if (table === "profiles") {
            return {
              id: item.id || self.createId(),
              user_id: item.user_id,
              email: item.email || null,
              business_type: item.business_type ?? null,
              is_onboarded: item.is_onboarded ?? false,
              created_at: item.created_at || now,
              updated_at: item.updated_at || now,
            };
          }
          if (table === "products") {
            return {
              id: item.id || self.createId(),
              user_id: item.user_id,
              name: item.name,
              sku: item.sku,
              price: item.price ?? 0,
              cost_price: item.cost_price ?? 0,
              stock_quantity: item.stock_quantity ?? 0,
              reorder_level: item.reorder_level ?? 5,
              gst_rate: item.gst_rate ?? 18,
              category: item.category ?? null,
              last_sold_date: item.last_sold_date ?? null,
              created_at: item.created_at || now,
              updated_at: item.updated_at || now,
            };
          }
          if (table === "invoices") {
            return {
              id: item.id || self.createId(),
              user_id: item.user_id,
              invoice_number: item.invoice_number,
              customer_name: item.customer_name,
              customer_gstin: item.customer_gstin ?? null,
              customer_state: item.customer_state,
              seller_state: item.seller_state,
              items: item.items ?? [],
              subtotal: item.subtotal ?? 0,
              cgst: item.cgst ?? 0,
              sgst: item.sgst ?? 0,
              igst: item.igst ?? 0,
              total: item.total ?? 0,
              invoice_date: item.invoice_date || now,
              created_at: item.created_at || now,
            };
          }
          return {
            ...item,
            id: item.id || self.createId(),
            created_at: item.created_at || now,
          };
        });

        db[table].push(...newItems);
        self.saveDb(db);
        return { data: Array.isArray(data) ? newItems : newItems[0], error: null };
      },

      update: (data: any) => {
        const updateFilter: Record<string, any> = { ...currentFilter };
        const updateChain: any = {
          eq: (k: string, v: any) => { updateFilter[k] = v; return updateChain; },
          then: (resolve: any) => {
            const db = self.getDb();
            if (db[table]) {
              db[table] = db[table].map((row: any) => {
                const match = Object.keys(updateFilter).every(k => row[k] === updateFilter[k]);
                if (!match) return row;
                if (table === "products" || table === "profiles") {
                  return { ...row, ...data, updated_at: new Date().toISOString() };
                }
                return { ...row, ...data };
              });
              self.saveDb(db);
            }
            resolve({ error: null });
          }
        };
        return updateChain;
      },

      delete: () => {
        const deleteFilter: Record<string, any> = { ...currentFilter };
        const deleteChain: any = {
          eq: (k: string, v: any) => { deleteFilter[k] = v; return deleteChain; },
          then: (resolve: any) => {
            const db = self.getDb();
            if (db[table]) {
              db[table] = db[table].filter((row: any) => {
                const match = Object.keys(deleteFilter).every(k => row[k] === deleteFilter[k]);
                return !match;
              });
              self.saveDb(db);
            }
            resolve({ error: null });
          }
        };
        return deleteChain;
      },

      then: (resolve: any) => {
        const db = self.getDb();
        let rows = db[table] || [];
        for (const k in currentFilter) {
          rows = rows.filter((r: any) => r[k] === currentFilter[k]);
        }
        rows = sortRows(rows);
        if (table === "profiles" && rows.length === 0 && currentFilter["user_id"]) {
          const sessionStr = localStorage.getItem(self.SESSION_KEY);
          const session = sessionStr ? JSON.parse(sessionStr) : null;
          const sessionEmail =
            session?.user?.id === currentFilter["user_id"] ? session?.user?.email || null : null;
          const profile = {
            id: self.createId(),
            user_id: currentFilter["user_id"],
            email: sessionEmail,
            business_type: null,
            is_onboarded: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const dbNow = self.getDb();
          dbNow.profiles.push(profile);
          self.saveDb(dbNow);
          rows = [profile];
        }
        resolve({ data: isSingle ? (rows[0] || null) : rows, error: null });
      }
    };
    return chain as any;
  }
}

// --- Client selection ---
// Default to local auth/data so demo credentials always work without Supabase.
// Set VITE_AUTH_PROVIDER=supabase to opt into real Supabase auth.
const AUTH_PROVIDER = (import.meta.env.VITE_AUTH_PROVIDER || "local").toLowerCase();

let client: any = new LocalMock();
if (AUTH_PROVIDER === "supabase") {
  try {
    if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
      client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    }
  } catch {
    client = new LocalMock();
  }
}

export const supabase = client;
