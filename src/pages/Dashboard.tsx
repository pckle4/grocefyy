import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { Package, TrendingUp, AlertTriangle, DollarSign, Skull, Star } from "lucide-react";
import { format, subDays } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  reorder_level: number;
  last_sold_date: string | null;
}

interface Invoice {
  id: string;
  total: number;
  subtotal: number;
  items: any;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).then(({ data }) => setProducts((data as Product[]) || []));
    supabase.from("invoices").select("*").eq("user_id", user.id).then(({ data }) => setInvoices((data as Invoice[]) || []));
  }, [user]);

  const totalProducts = products.length;
  const totalValue = products.reduce((s, p) => s + p.price * p.stock_quantity, 0);
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const lowStock = products.filter((p) => p.stock_quantity <= p.reorder_level);
  const tenDaysAgo = subDays(new Date(), 10);
  const deadStock = products.filter(
    (p) => !p.last_sold_date || new Date(p.last_sold_date) < tenDaysAgo
  );

  // Top seller by invoice item frequency
  const itemCounts: Record<string, number> = {};
  invoices.forEach((inv) => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    items.forEach((item: any) => {
      itemCounts[item.product_id] = (itemCounts[item.product_id] || 0) + (item.quantity || 0);
    });
  });
  const topSellerId = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topSeller = products.find((p) => p.id === topSellerId);

  const cards = [
    { label: "Total Products", value: totalProducts, icon: Package, color: "bg-primary/20 text-primary" },
    { label: "Inventory Value", value: `₹${totalValue.toLocaleString("en-IN")}`, icon: DollarSign, color: "bg-success/20 text-success" },
    { label: "Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-primary/20 text-primary" },
    { label: "Low Stock Items", value: lowStock.length, icon: AlertTriangle, color: "bg-warning/20 text-warning" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-heading font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-xl font-heading font-bold mt-1">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Action Feed */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Low Stock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-heading font-bold">Low Stock Alert</h3>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">All stocked up! 🎉</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-warning font-semibold">{p.stock_quantity} left</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Dead Stock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Skull className="w-5 h-5 text-destructive" />
            <h3 className="font-heading font-bold">Dead Stock</h3>
          </div>
          {deadStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everything's selling! ✨</p>
          ) : (
            <ul className="space-y-2">
              {deadStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {p.last_sold_date
                      ? `Last: ${format(new Date(p.last_sold_date), "dd MMM")}`
                      : "Never sold"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Top Seller */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold">Top Seller</h3>
          </div>
          {topSeller ? (
            <div>
              <p className="font-semibold text-lg">{topSeller.name}</p>
              <p className="text-sm text-muted-foreground">
                {itemCounts[topSellerId!]} units sold
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Start selling to see stats! 📊</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
