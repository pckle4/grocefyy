import { motion } from "framer-motion";
import { Package, FileText, TrendingUp, ShoppingCart } from "lucide-react";

const icons: Record<string, typeof Package> = {
  inventory: Package,
  invoices: FileText,
  reports: TrendingUp,
  cart: ShoppingCart,
};

interface EmptyStateProps {
  type: keyof typeof icons;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ type, title, description, action }: EmptyStateProps) {
  const Icon = icons[type] || Package;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-6"
      >
        <Icon className="w-10 h-10 text-primary" />
      </motion.div>
      <h3 className="text-xl font-heading font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  );
}
