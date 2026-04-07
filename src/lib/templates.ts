export interface ProductTemplate {
  id: string;
  name: string;
  sku: string;
  default_price: number;
  default_cost_price: number;
  default_gst_rate: number;
  category: string;
}

export const BUSINESS_TEMPLATES: Record<string, ProductTemplate[]> = {
  "Grocery": [
    { id: "g1", name: "Premium Basmati Rice 1kg", sku: "GRO-RICE-01", default_price: 150, default_cost_price: 120, default_gst_rate: 5, category: "Grains" },
    { id: "g2", name: "Sunflower Oil 1L", sku: "GRO-OIL-01", default_price: 180, default_cost_price: 160, default_gst_rate: 5, category: "Oils" },
    { id: "g3", name: "White Sugar 1kg", sku: "GRO-SUG-01", default_price: 45, default_cost_price: 38, default_gst_rate: 5, category: "Essentials" },
    { id: "g4", name: "Fresh Milk 1L", sku: "GRO-MILK-01", default_price: 66, default_cost_price: 60, default_gst_rate: 0, category: "Dairy" },
    { id: "g5", name: "Chocolate Biscuits", sku: "GRO-BIS-01", default_price: 30, default_cost_price: 22, default_gst_rate: 18, category: "Snacks" },
    { id: "g6", name: "Salt 1kg", sku: "GRO-SALT-01", default_price: 25, default_cost_price: 20, default_gst_rate: 0, category: "Essentials" },
    { id: "g7", name: "Whole Wheat Atta 5kg", sku: "GRO-WHT-01", default_price: 220, default_cost_price: 190, default_gst_rate: 5, category: "Grains" },
    { id: "g8", name: "Tur Dal 1kg", sku: "GRO-DAL-01", default_price: 160, default_cost_price: 135, default_gst_rate: 5, category: "Grains" },
  ],
  "Stationery": [
    { id: "s1", name: "A4 Printer Paper (500 sheets)", sku: "STA-PAP-01", default_price: 250, default_cost_price: 200, default_gst_rate: 12, category: "Paper" },
    { id: "s2", name: "Blue Ballpoint Pen", sku: "STA-PEN-01", default_price: 10, default_cost_price: 6, default_gst_rate: 18, category: "Pens" },
    { id: "s3", name: "Spiral Notebook 200 pages", sku: "STA-NB-01", default_price: 60, default_cost_price: 45, default_gst_rate: 12, category: "Notebooks" },
    { id: "s4", name: "Highlighter Set (5 colors)", sku: "STA-HL-01", default_price: 120, default_cost_price: 85, default_gst_rate: 18, category: "Markers" },
    { id: "s5", name: "Sticky Notes 3x3", sku: "STA-SN-01", default_price: 50, default_cost_price: 35, default_gst_rate: 12, category: "Paper" },
    { id: "s6", name: "Scientific Calculator", sku: "STA-CAL-01", default_price: 850, default_cost_price: 700, default_gst_rate: 18, category: "Electronics" },
  ],
  "Bakery": [
    { id: "b1", name: "Whole Wheat Bread", sku: "BAK-BREAD-01", default_price: 50, default_cost_price: 35, default_gst_rate: 0, category: "Bread" },
    { id: "b2", name: "Chocolate Truffle Cake 500g", sku: "BAK-CAKE-01", default_price: 450, default_cost_price: 280, default_gst_rate: 18, category: "Cakes" },
    { id: "b3", name: "Butter Croissant", sku: "BAK-PST-01", default_price: 80, default_cost_price: 45, default_gst_rate: 18, category: "Pastry" },
    { id: "b4", name: "Blueberry Muffin", sku: "BAK-MUF-01", default_price: 110, default_cost_price: 60, default_gst_rate: 18, category: "Pastry" },
    { id: "b5", name: "Oatmeal Cookies (Pack of 6)", sku: "BAK-COO-01", default_price: 120, default_cost_price: 75, default_gst_rate: 18, category: "Cookies" },
  ],
  "Electrical": [
    { id: "e1", name: "LED Bulb 9W", sku: "ELE-LED-01", default_price: 110, default_cost_price: 75, default_gst_rate: 12, category: "Lighting" },
    { id: "e2", name: "Copper Wire 1.5mm (90m)", sku: "ELE-WIR-01", default_price: 1200, default_cost_price: 950, default_gst_rate: 18, category: "Wiring" },
    { id: "e3", name: "3-Pin Plug Top 6A", sku: "ELE-PLG-01", default_price: 45, default_cost_price: 25, default_gst_rate: 18, category: "Accessories" },
    { id: "e4", name: "Ceiling Fan 1200mm", sku: "ELE-FAN-01", default_price: 2400, default_cost_price: 1800, default_gst_rate: 18, category: "Appliances" },
  ],
  "Clothing": [
    { id: "c1", name: "Men's Cotton T-Shirt", sku: "CLO-TSH-01", default_price: 499, default_cost_price: 250, default_gst_rate: 5, category: "Men's Wear" },
    { id: "c2", name: "Denim Jeans Classic", sku: "CLO-JNS-01", default_price: 1499, default_cost_price: 800, default_gst_rate: 12, category: "Unisex" },
    { id: "c3", name: "Women's Kurti Setup", sku: "CLO-KUR-01", default_price: 899, default_cost_price: 450, default_gst_rate: 5, category: "Women's Wear" },
    { id: "c4", name: "Cotton Socks (Pack of 3)", sku: "CLO-SCK-01", default_price: 299, default_cost_price: 120, default_gst_rate: 5, category: "Accessories" },
  ],
  "Restaurant": [
    { id: "r1", name: "Margherita Pizza", sku: "RES-PZ-01", default_price: 299, default_cost_price: 120, default_gst_rate: 5, category: "Pizza" },
    { id: "r2", name: "Butter Chicken", sku: "RES-MC-01", default_price: 350, default_cost_price: 180, default_gst_rate: 5, category: "Main Course" },
    { id: "r3", name: "Garlic Naan", sku: "RES-BR-01", default_price: 55, default_cost_price: 20, default_gst_rate: 5, category: "Breads" },
    { id: "r4", name: "Cold Coffee", sku: "RES-BEV-01", default_price: 140, default_cost_price: 50, default_gst_rate: 5, category: "Beverages" },
  ]
};
