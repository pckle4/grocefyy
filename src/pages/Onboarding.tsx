import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, X, Store, ChevronRight, Sparkles } from "lucide-react";
import { BUSINESS_TEMPLATES, ProductTemplate } from "@/lib/templates";

const BUSINESS_TYPES = [
  { label: "Bakery", emoji: "🍞" },
  { label: "Restaurant", emoji: "🍽️" },
  { label: "Grocery", emoji: "🛒" },
  { label: "Stationery", emoji: "📝" },
  { label: "Electrical", emoji: "⚡" },
  { label: "Clothing", emoji: "👕" },
];



export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState("");
  const [customType, setCustomType] = useState("");
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualProducts, setManualProducts] = useState<Array<{
    name: string; sku: string; price: string; cost_price: string; gst_rate: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const effectiveType = businessType === "Custom" ? customType : businessType;

  useEffect(() => {
    if (step === 2 && effectiveType) {
      setTemplates(BUSINESS_TEMPLATES[effectiveType] || []);
    }
  }, [step, effectiveType]);

  const toggleTemplate = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addManualProduct = () => {
    setManualProducts((p) => [...p, { name: "", sku: "", price: "0", cost_price: "0", gst_rate: "18" }]);
  };

  const removeManualProduct = (i: number) => {
    setManualProducts((p) => p.filter((_, idx) => idx !== i));
  };

  const updateManual = (i: number, field: string, value: string) => {
    setManualProducts((p) => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const selectedTemplates = templates.filter((t) => selected.has(t.id));
      const products = [
        ...selectedTemplates.map((t) => ({
          user_id: user.id,
          name: t.name,
          sku: t.sku,
          price: t.default_price,
          cost_price: t.default_cost_price,
          gst_rate: t.default_gst_rate,
          category: t.category,
          stock_quantity: 0,
          reorder_level: 5,
        })),
        ...manualProducts
          .filter((p) => p.name.trim() && p.sku.trim())
          .map((p) => ({
            user_id: user.id,
            name: p.name.trim(),
            sku: p.sku.trim(),
            price: parseFloat(p.price) || 0,
            cost_price: parseFloat(p.cost_price) || 0,
            gst_rate: parseFloat(p.gst_rate) || 18,
            stock_quantity: 0,
            reorder_level: 5,
          })),
      ];

      if (products.length > 0) {
        const { error } = await supabase.from("products").insert(products);
        if (error) throw error;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ business_type: effectiveType, is_onboarded: true })
        .eq("user_id", user.id);
      if (profileError) throw profileError;

      await refreshProfile();
      toast.success("Setup complete! 🎉");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="glass rounded-2xl p-6 md:p-8">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Store className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-heading font-bold">What's your business?</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt.label}
                      onClick={() => { setBusinessType(bt.label); setCustomType(""); }}
                      className={`p-4 rounded-xl text-left transition-all border-2 ${
                        businessType === bt.label
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <span className="text-2xl">{bt.emoji}</span>
                      <p className="mt-2 font-semibold text-sm">{bt.label}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => setBusinessType("Custom")}
                    className={`p-4 rounded-xl text-left transition-all border-2 ${
                      businessType === "Custom"
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-2xl">✨</span>
                    <p className="mt-2 font-semibold text-sm">Other</p>
                  </button>
                </div>
                {businessType === "Custom" && (
                  <Input
                    placeholder="Enter your business type..."
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="mt-4 bg-secondary/50"
                  />
                )}
                <Button
                  onClick={() => setStep(2)}
                  disabled={!effectiveType}
                  className="w-full mt-6 gap-2"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-heading font-bold">Pick your products</h2>
                </div>
                {templates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No templates for "{effectiveType}" — add your own in the next step!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggleTemplate(t.id)}
                        className={`p-4 rounded-xl text-left transition-all border-2 flex items-start gap-3 ${
                          selected.has(t.id)
                            ? "border-primary bg-primary/10"
                            : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0 ${
                          selected.has(t.id) ? "bg-primary" : "bg-secondary"
                        }`}>
                          {selected.has(t.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">₹{t.default_price} · GST {t.default_gst_rate}%</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-1 gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Plus className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-heading font-bold">Add custom products</h2>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {manualProducts.map((p, i) => (
                    <div key={i} className="p-4 rounded-xl bg-secondary/30 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Product {i + 1}</span>
                        <button onClick={() => removeManualProduct(i)}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Name" value={p.name} onChange={(e) => updateManual(i, "name", e.target.value)} className="bg-secondary/50 text-sm" />
                        <Input placeholder="SKU" value={p.sku} onChange={(e) => updateManual(i, "sku", e.target.value)} className="bg-secondary/50 text-sm" />
                        <Input placeholder="Price" type="number" value={p.price} onChange={(e) => updateManual(i, "price", e.target.value)} className="bg-secondary/50 text-sm" />
                        <Input placeholder="GST %" type="number" value={p.gst_rate} onChange={(e) => updateManual(i, "gst_rate", e.target.value)} className="bg-secondary/50 text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={addManualProduct} className="w-full mt-3 gap-2">
                  <Plus className="w-4 h-4" /> Add Product
                </Button>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(4)} className="flex-1 gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center py-8">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-5xl mb-4"
                  >
                    🚀
                  </motion.div>
                  <h2 className="text-2xl font-heading font-bold mb-2">Ready to go!</h2>
                  <p className="text-muted-foreground mb-2">
                    Business: <strong>{effectiveType}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    {selected.size + manualProducts.filter((p) => p.name.trim()).length} products selected
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
                  <Button onClick={handleComplete} disabled={loading} className="flex-1">
                    {loading ? "Setting up..." : "Launch Grocify! 🎉"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
