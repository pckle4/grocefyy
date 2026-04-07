import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, DollarSign, Package, Skull } from "lucide-react";
import { subDays } from "date-fns";

export default function Reports() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).then(({ data }) => setProducts(data || []));
    supabase.from("invoices").select("*").eq("user_id", user.id).then(({ data }) => setInvoices(data || []));
  }, [user]);

  const revenue = invoices.reduce((s, i) => s + Number(i.total), 0);
  const costFromInvoices = invoices.reduce((s, inv) => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    return s + items.reduce((cs: number, item: any) => {
      if (typeof item.cost_price === "number") {
        return cs + (item.cost_price * (item.quantity || 0));
      }
      const prod = products.find((p) => p.id === item.product_id);
      return cs + (prod ? prod.cost_price * (item.quantity || 0) : 0);
    }, 0);
  }, 0);
  const profit = revenue - costFromInvoices;
  const inventoryValue = products.reduce((s, p) => s + p.price * p.stock_quantity, 0);
  const tenDaysAgo = subDays(new Date(), 10);
  const deadStock = products.filter(
    (p) => !p.last_sold_date || new Date(p.last_sold_date) < tenDaysAgo
  );

  // Monthly revenue chart
  const monthlyData: Record<string, number> = {};
  invoices.forEach((inv) => {
    const month = new Date(inv.invoice_date || inv.created_at || Date.now()).toLocaleString("en-IN", { month: "short", year: "2-digit" });
    monthlyData[month] = (monthlyData[month] || 0) + Number(inv.total);
  });
  const chartData = Object.entries(monthlyData).map(([month, val]) => ({ month, revenue: Math.round(val) }));

  const stats = [
    { label: "Total Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-primary/20 text-primary" },
    { label: "Profit", value: `₹${profit.toLocaleString("en-IN")}`, icon: DollarSign, color: "bg-success/20 text-success" },
    { label: "Inventory Value", value: `₹${inventoryValue.toLocaleString("en-IN")}`, icon: Package, color: "bg-primary/20 text-primary" },
    { label: "Dead Stock", value: `${deadStock.length} items`, icon: Skull, color: "bg-destructive/20 text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-heading font-bold">Reports</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-xl font-heading font-bold mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-5"
        >
          <h3 className="font-heading font-bold mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(204 20% 60% / 0.3)" />
              <XAxis dataKey="month" stroke="hsl(204 15% 80%)" fontSize={12} />
              <YAxis stroke="hsl(204 15% 80%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(204 25% 48%)",
                  border: "1px solid hsl(204 20% 60% / 0.3)",
                  borderRadius: "0.75rem",
                  color: "hsl(48 100% 97%)",
                }}
              />
              <Bar dataKey="revenue" fill="hsl(48 100% 91%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Dead Stock List */}
      {deadStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-5"
        >
          <h3 className="font-heading font-bold mb-4">Dead Stock (10+ days no sales)</h3>
          <div className="space-y-2">
            {deadStock.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary/20">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground">
                  {p.last_sold_date
                    ? `Last sold: ${new Date(p.last_sold_date).toLocaleDateString("en-IN")}`
                    : "Never sold"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
