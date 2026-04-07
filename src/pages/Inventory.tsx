import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  reorder_level: number;
  gst_rate: number;
  category: string | null;
  last_sold_date: string | null;
}

const emptyProduct = {
  name: "", sku: "", price: "", cost_price: "", stock_quantity: "", reorder_level: "5", gst_rate: "18", category: "",
};

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyProduct);
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("name");
    setProducts((data as Product[]) || []);
  };

  useEffect(() => { fetchProducts(); }, [user]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Name and SKU are required");
      return;
    }
    const price = parseFloat(form.price) || 0;
    if (price < 0) { toast.error("Price cannot be negative"); return; }
    const cost_price = parseFloat(form.cost_price) || 0;
    if (cost_price < 0) { toast.error("Cost price cannot be negative"); return; }
    const stock_quantity = parseInt(form.stock_quantity) || 0;
    if (stock_quantity < 0) { toast.error("Stock can't be negative"); return; }
    const reorder_level = parseInt(form.reorder_level) || 0;
    if (reorder_level < 0) { toast.error("Reorder level cannot be negative"); return; }
    const gst_rate = parseFloat(form.gst_rate) || 0;
    if (gst_rate < 0 || gst_rate > 100) { toast.error("GST rate must be between 0 and 100"); return; }

    setLoading(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from("products")
          .update({
            name: form.name.trim(),
            sku: form.sku.trim(),
            price,
            cost_price,
            stock_quantity,
            reorder_level,
            gst_rate,
            category: form.category || null,
          })
          .eq("id", editId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Product updated! ✅");
      } else {
        const { error } = await supabase.from("products").insert({
          user_id: user.id,
          name: form.name.trim(),
          sku: form.sku.trim(),
          price,
          cost_price,
          stock_quantity,
          reorder_level: parseInt(form.reorder_level) || 5,
          gst_rate: parseFloat(form.gst_rate) || 18,
          category: form.category || null,
        });
        if (error) {
          if (error.message.includes("duplicate")) {
            toast.error("SKU already exists!");
          } else throw error;
          return;
        }
        toast.success("Product added! 🎉");
      }
      setDialogOpen(false);
      setForm(emptyProduct);
      setEditId(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      price: String(p.price),
      cost_price: String(p.cost_price),
      stock_quantity: String(p.stock_quantity),
      reorder_level: String(p.reorder_level),
      gst_rate: String(p.gst_rate),
      category: p.category || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Inventory</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyProduct); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">{editId ? "Edit" : "Add"} Product</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Sell Price (₹)</Label>
                <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Cost Price (₹)</Label>
                <Input type="number" min="0" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Stock Qty</Label>
                <Input type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Input type="number" min="0" max="28" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} className="bg-secondary/50" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full mt-2">
              {loading ? "Saving..." : editId ? "Update" : "Add"} Product
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary/30" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          type="inventory"
          title="No products yet"
          description="Add your first product to start managing inventory"
          action={<Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {/* Header - desktop */}
          <div className="hidden md:grid grid-cols-8 gap-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
            <span className="col-span-2">Product</span>
            <span>SKU</span>
            <span>Price</span>
            <span>Cost</span>
            <span>Stock</span>
            <span>GST</span>
            <span>Actions</span>
          </div>
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-xl p-4 md:grid md:grid-cols-8 md:gap-3 md:items-center"
            >
              <div className="col-span-2 flex items-center gap-3 mb-2 md:mb-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  p.stock_quantity <= p.reorder_level ? "bg-warning/20" : "bg-primary/20"
                }`}>
                  <Package className={`w-4 h-4 ${p.stock_quantity <= p.reorder_level ? "text-warning" : "text-primary"}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
                  {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground hidden md:block">{p.sku}</p>
              <p className="text-sm font-semibold hidden md:block">₹{p.price}</p>
              <p className="text-sm text-muted-foreground hidden md:block">₹{p.cost_price}</p>
              <div className="hidden md:block">
                <span className={`text-sm font-semibold ${p.stock_quantity <= p.reorder_level ? "text-warning" : ""}`}>
                  {p.stock_quantity}
                </span>
              </div>
              <p className="text-sm text-muted-foreground hidden md:block">{p.gst_rate}%</p>
              {/* Mobile info row */}
              <div className="flex items-center justify-between md:hidden text-sm mb-2">
                <span className="text-muted-foreground">{p.sku}</span>
                <span className="font-semibold">₹{p.price}</span>
                <span className={p.stock_quantity <= p.reorder_level ? "text-warning font-semibold" : ""}>
                  Stock: {p.stock_quantity}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
