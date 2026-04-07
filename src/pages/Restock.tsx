import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { subDays } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  reorder_level: number;
  last_sold_date: string | null;
}

interface RestockItem {
  product: Product;
  action: "restock" | "avoid";
  suggestedQty: number;
  reason: string;
  urgency: "urgent" | "normal" | "avoid";
}

export default function Restock() {
  const { user } = useAuth();
  const [items, setItems] = useState<RestockItem[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("products").select("*").eq("user_id", user.id),
      supabase.from("invoices").select("*").eq("user_id", user.id),
    ]).then(([prodRes, invRes]) => {
      const products = (prodRes.data || []) as Product[];
      const invs = invRes.data || [];
      setInvoices(invs);

      // Calculate sales per product
      const salesCount: Record<string, number> = {};
      invs.forEach((inv: any) => {
        const items = Array.isArray(inv.items) ? inv.items : [];
        items.forEach((item: any) => {
          salesCount[item.product_id] = (salesCount[item.product_id] || 0) + (item.quantity || 0);
        });
      });

      const tenDaysAgo = subDays(new Date(), 10);
      const suggestions: RestockItem[] = [];

      products.forEach((p) => {
        const sold = salesCount[p.id] || 0;
        const isDead = !p.last_sold_date || new Date(p.last_sold_date) < tenDaysAgo;
        const isLow = p.stock_quantity <= p.reorder_level;
        const isHighDemand = sold > 10;

        if (isDead && p.stock_quantity > 0) {
          suggestions.push({
            product: p,
            action: "avoid",
            suggestedQty: 0,
            reason: `Avoid restocking ${p.name} (No recent sales)`,
            urgency: "avoid"
          });
        } else if (isHighDemand && isLow) {
          const restockQty = p.reorder_level * 3;
          suggestions.push({
            product: p,
            action: "restock",
            suggestedQty: restockQty,
            reason: `Restock ${restockQty} units of ${p.name}`,
            urgency: "urgent"
          });
        } else if (isLow && !isDead) {
          const restockQty = Math.max(p.reorder_level * 2 - p.stock_quantity, p.reorder_level);
          suggestions.push({
            product: p,
            action: "restock",
            suggestedQty: restockQty,
            reason: `Restock ${restockQty} units of ${p.name}`,
            urgency: "normal"
          });
        }
      });

      // Sort: restock first
      suggestions.sort((a, b) => (a.action === "restock" ? -1 : 1));
      setItems(suggestions);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-7 h-7 text-primary" />
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Smart Restock Planner</h1>
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-8 text-center"
        >
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-4xl mb-4">
            ✅
          </motion.div>
          <h3 className="font-heading font-bold text-xl mb-2">All stocked up!</h3>
          <p className="text-muted-foreground">No restocking actions needed right now</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                item.urgency === "urgent" ? "bg-destructive/20" : item.urgency === "normal" ? "bg-success/20" : "bg-warning/20"
              }`}>
                {item.urgency === "urgent" ? (
                  <TrendingUp className="w-5 h-5 text-destructive" />
                ) : item.urgency === "normal" ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{item.product.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    item.urgency === "urgent" ? "bg-destructive text-destructive-foreground" : 
                    item.urgency === "normal" ? "bg-success text-primary-foreground" : 
                    "bg-warning text-primary-foreground"
                  }`}>
                    {item.urgency}
                  </span>
                  <p className="text-sm text-muted-foreground truncate">{item.reason}</p>
                </div>
              </div>
              {item.action === "restock" && (
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-heading font-bold ${item.urgency === "urgent" ? "text-destructive" : "text-success"}`}>
                    +{item.suggestedQty}
                  </p>
                  <p className="text-xs text-muted-foreground">units</p>
                </div>
              )}
              {item.action === "avoid" && (
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
