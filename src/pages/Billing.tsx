import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { INDIAN_STATES } from "@/lib/indian-states";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  gst_rate: number;
  stock_quantity: number;
}

interface InvoiceItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  cost_price: number;
  gst_rate: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_state: string;
  seller_state: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  invoice_date?: string;
  created_at?: string;
  items: any;
}

export default function Billing() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [sellerState, setSellerState] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const fetchData = async () => {
    if (!user) return;
    const [prodRes, invRes] = await Promise.all([
      supabase.from("products").select("id,name,sku,price,cost_price,gst_rate,stock_quantity").eq("user_id", user.id),
      supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProducts((prodRes.data as Product[]) || []);
    setInvoices((invRes.data as Invoice[]) || []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const addItem = () => {
    if (products.length === 0) { toast.error("Add products first"); return; }
    setItems([...items, { product_id: "", name: "", quantity: 1, price: 0, cost_price: 0, gst_rate: 0 }]);
  };

  const updateItem = (i: number, field: string, value: any) => {
    setItems(items.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      if (field === "product_id") {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          updated.name = prod.name;
          updated.price = prod.price;
          updated.cost_price = prod.cost_price || 0;
          updated.gst_rate = prod.gst_rate;
        }
      }
      return updated;
    }));
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const isSameState = customerState && sellerState && customerState === sellerState;

  // Calculate totals and precise item details
  let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
  
  const computedItems = items.map((item) => {
    const taxable_amount = item.price * item.quantity;
    let cgst = 0, sgst = 0, igst = 0;

    const exactGstAmount = (taxable_amount * item.gst_rate) / 100;

    if (isSameState) {
      cgst = Number((exactGstAmount / 2).toFixed(2));
      sgst = Number((exactGstAmount / 2).toFixed(2));
    } else if (customerState && sellerState) {
      igst = Number(exactGstAmount.toFixed(2));
    }

    const itemTotal = taxable_amount + cgst + sgst + igst;

    subtotal += taxable_amount;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    return {
      ...item,
      taxable_amount: Number(taxable_amount.toFixed(2)),
      cgst,
      sgst,
      igst,
      total: Number(itemTotal.toFixed(2)),
    };
  });

  const total = Math.round((subtotal + totalCgst + totalSgst + totalIgst) * 100) / 100;

  const handleCreateInvoice = async () => {
    if (!user) return;
    if (!customerName.trim()) { toast.error("Customer name required"); return; }
    if (!customerState || !sellerState) { toast.error("Select both states"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    for (const item of items) {
      if (!item.product_id) { toast.error("Select a product for each item"); return; }
      if (item.quantity <= 0) { toast.error("Quantity must be positive"); return; }
      const prod = products.find((p) => p.id === item.product_id);
      if (prod && item.quantity > prod.stock_quantity) {
        toast.error(`Not enough stock for ${item.name} (available: ${prod.stock_quantity})`);
        return;
      }
    }

    setLoading(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error: invError } = await supabase.from("invoices").insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        customer_name: customerName.trim(),
        customer_gstin: customerGstin || null,
        customer_state: customerState,
        seller_state: sellerState,
        items: JSON.parse(JSON.stringify(computedItems)),
        subtotal: Math.round(subtotal * 100) / 100,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        igst: Math.round(totalIgst * 100) / 100,
        total,
      });
      if (invError) throw invError;

      // Reduce stock & update last_sold_date
      const now = new Date().toISOString();
      for (const item of items) {
        const prod = products.find((p) => p.id === item.product_id);
        if (prod) {
          const newQty = prod.stock_quantity - item.quantity;
          const { error } = await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, newQty), last_sold_date: now })
            .eq("id", item.product_id)
            .eq("user_id", user.id);
          if (error) console.error("Stock update error:", error);
        }
      }

      toast.success(`Invoice ${invoiceNumber} created! 🧾`);
      setDialogOpen(false);
      setCustomerName("");
      setCustomerGstin("");
      setCustomerState("");
      setItems([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-heading font-bold">GST Billing</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/30 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Create Invoice</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Customer Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Customer GSTIN</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} placeholder="Optional" className="bg-secondary/50" />
              </div>
              <div>
                <Label>Seller State *</Label>
                <Select value={sellerState} onValueChange={setSellerState}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer State *</Label>
                <Select value={customerState} onValueChange={setCustomerState}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-semibold">Items</Label>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Item
                </Button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary/30 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Product</Label>
                    <Select value={item.product_id} onValueChange={(v) => updateItem(i, "product_id", v)}>
                      <SelectTrigger className="bg-secondary/50 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 0)} className="bg-secondary/50 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" value={item.price} onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)} className="bg-secondary/50 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">GST%</Label>
                    <Input type="number" value={item.gst_rate} readOnly className="bg-secondary/50 text-sm opacity-60" />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            {items.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-secondary/20 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                {isSameState ? (
                  <>
                    <div className="flex justify-between text-muted-foreground"><span>CGST</span><span>₹{totalCgst.toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>SGST</span><span>₹{totalSgst.toFixed(2)}</span></div>
                  </>
                ) : customerState && sellerState ? (
                  <div className="flex justify-between text-muted-foreground"><span>IGST</span><span>₹{totalIgst.toFixed(2)}</span></div>
                ) : null}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border/30">
                  <span>Total</span><span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button onClick={handleCreateInvoice} disabled={loading} className="w-full mt-2">
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          type="invoices"
          title="No invoices yet"
          description="Create your first GST invoice to start billing"
          action={<Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Invoice</Button>}
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{inv.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">{inv.customer_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(inv.invoice_date || inv.created_at || Date.now()), "dd MMM yyyy")}
                </span>
                <span className="font-heading font-bold text-lg">₹{inv.total.toLocaleString("en-IN")}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
