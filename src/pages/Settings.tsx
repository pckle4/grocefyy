import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Store } from "lucide-react";

export default function SettingsPage() {
  const { profile, user, signOut } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-heading font-bold">Settings</h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold">Profile</h3>
        </div>
        <div>
          <Label className="text-muted-foreground">Email</Label>
          <Input value={user?.email || ""} readOnly className="bg-secondary/30 opacity-70" />
        </div>
        <div>
          <Label className="text-muted-foreground">Business Type</Label>
          <Input value={profile?.business_type || "Not set"} readOnly className="bg-secondary/30 opacity-70" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold">Account</h3>
        </div>
        <Button variant="destructive" onClick={signOut}>Sign Out</Button>
      </motion.div>
    </div>
  );
}
