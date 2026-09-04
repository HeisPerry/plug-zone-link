export const APP_NAME = "PlugZone";

export const AD_CATEGORIES = [
  "Gaming",
  "VPNs & Proxies",
  "Social Media Services",
  "Subscriptions",
  "Freelancing & Accounts",
  "Courses & Toolkits",
  "Verification Services",
  "Websites & Templates",
  "Other Digital Services",
] as const;
export type AdCategory = (typeof AD_CATEGORIES)[number];

export type DetailFieldType = "text" | "textarea" | "select" | "number" | "url" | "checkbox";

export interface DetailField {
  key: string;
  label: string;
  type: DetailFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
}

export interface Subcategory {
  name: string;
  fields: DetailField[];
}

export interface CategorySpec {
  name: AdCategory;
  subcategories: Subcategory[];
}

// 9-category taxonomy. Each subcategory carries its own dynamic fields,
// stored as JSONB in ads.details. Fields are intentionally sparse — only
// show what a buyer in that niche needs to vet the listing.
export const CATEGORY_TAXONOMY: CategorySpec[] = [
  {
    name: "Electronics",
    subcategories: [
      { name: "Phones & Tablets", fields: [
        { key: "brand", label: "Brand", type: "select", options: ["Apple","Samsung","Google","Xiaomi","Oppo","Tecno","Infinix","Huawei","Nokia","Other"], required: true },
        { key: "condition", label: "Condition", type: "select", options: ["New","Open box","Like new","Fairly used","For parts"], required: true },
        { key: "storage", label: "Storage", type: "text", placeholder: "e.g. 128GB" },
        { key: "ram", label: "RAM", type: "text", placeholder: "e.g. 6GB" },
        { key: "warranty", label: "Warranty left", type: "text", placeholder: "e.g. 3 months / none" },
      ]},
      { name: "Laptops & Computers", fields: [
        { key: "brand", label: "Brand", type: "select", options: ["Apple","HP","Dell","Lenovo","Asus","Acer","Microsoft","Other"], required: true },
        { key: "condition", label: "Condition", type: "select", options: ["New","Open box","Like new","Fairly used","For parts"], required: true },
        { key: "cpu", label: "Processor", type: "text", placeholder: "e.g. M2 / i5-1135G7" },
        { key: "ram", label: "RAM", type: "text", placeholder: "e.g. 16GB" },
        { key: "storage", label: "Storage", type: "text", placeholder: "e.g. 512GB SSD" },
      ]},
      { name: "Audio & Wearables", fields: [
        { key: "brand", label: "Brand", type: "select", options: ["Apple","Sony","Bose","JBL","Samsung","Anker","Other"], required: true },
        { key: "condition", label: "Condition", type: "select", options: ["New","Open box","Like new","Fairly used"], required: true },
      ]},
      { name: "TVs & Home Electronics", fields: [
        { key: "brand", label: "Brand", type: "text", required: true },
        { key: "size", label: "Screen size", type: "text", placeholder: "e.g. 43 inches" },
        { key: "condition", label: "Condition", type: "select", options: ["New","Open box","Like new","Fairly used"], required: true },
      ]},
    ],
  },
  {
    name: "Fashion",
    subcategories: [
      { name: "Men's Clothing", fields: [
        { key: "size", label: "Size", type: "select", options: ["XS","S","M","L","XL","XXL","XXXL"] },
        { key: "brand", label: "Brand", type: "text" },
        { key: "condition", label: "Condition", type: "select", options: ["New with tags","New without tags","Like new","Fairly used"], required: true },
      ]},
      { name: "Women's Clothing", fields: [
        { key: "size", label: "Size", type: "select", options: ["XS","S","M","L","XL","XXL"] },
        { key: "brand", label: "Brand", type: "text" },
        { key: "condition", label: "Condition", type: "select", options: ["New with tags","New without tags","Like new","Fairly used"], required: true },
      ]},
      { name: "Shoes", fields: [
        { key: "size", label: "Shoe size", type: "text", placeholder: "e.g. 42 / UK 8", required: true },
        { key: "brand", label: "Brand", type: "text" },
        { key: "condition", label: "Condition", type: "select", options: ["New","Like new","Fairly used"], required: true },
      ]},
      { name: "Bags & Accessories", fields: [
        { key: "brand", label: "Brand", type: "text" },
        { key: "condition", label: "Condition", type: "select", options: ["New","Like new","Fairly used"], required: true },
      ]},
    ],
  },
  {
    name: "Services",
    subcategories: [
      { name: "Web & Design", fields: [
        { key: "portfolio", label: "Portfolio link", type: "url", placeholder: "https://…" },
        { key: "turnaround", label: "Turnaround", type: "text", placeholder: "e.g. 3 days" },
      ]},
      { name: "Repairs & Maintenance", fields: [
        { key: "specialty", label: "Specialty", type: "text", placeholder: "e.g. AC, phones, cars" },
        { key: "area", label: "Service area", type: "text", placeholder: "e.g. Lagos mainland" },
      ]},
      { name: "Tutoring & Lessons", fields: [
        { key: "subject", label: "Subject", type: "text", required: true },
        { key: "level", label: "Level", type: "select", options: ["Primary","JSS","SSS","Undergraduate","Professional"] },
        { key: "mode", label: "Mode", type: "select", options: ["Online","In-person","Hybrid"] },
      ]},
      { name: "Cleaning & Home", fields: [
        { key: "frequency", label: "Frequency", type: "select", options: ["One-off","Weekly","Monthly"] },
        { key: "area", label: "Service area", type: "text" },
      ]},
    ],
  },
  {
    name: "Vehicles",
    subcategories: [
      { name: "Cars", fields: [
        { key: "make", label: "Make", type: "text", required: true, placeholder: "e.g. Toyota" },
        { key: "model", label: "Model", type: "text", required: true },
        { key: "year", label: "Year", type: "number", placeholder: "e.g. 2018" },
        { key: "mileage", label: "Mileage", type: "text", placeholder: "e.g. 45,000 km" },
        { key: "transmission", label: "Transmission", type: "select", options: ["Automatic","Manual"] },
        { key: "condition", label: "Condition", type: "select", options: ["New","Foreign used","Nigerian used","For parts"] },
      ]},
      { name: "Motorcycles & Tricycles", fields: [
        { key: "make", label: "Make", type: "text", required: true },
        { key: "model", label: "Model", type: "text" },
        { key: "year", label: "Year", type: "number" },
        { key: "mileage", label: "Mileage", type: "text" },
      ]},
      { name: "Auto Parts", fields: [
        { key: "part", label: "Part", type: "text", required: true },
        { key: "compatible", label: "Compatible with", type: "text", placeholder: "e.g. 2015 Corolla" },
        { key: "condition", label: "Condition", type: "select", options: ["New","Fairly used"] },
      ]},
    ],
  },
  {
    name: "Property",
    subcategories: [
      { name: "For Rent", fields: [
        { key: "type", label: "Type", type: "select", options: ["Self-contained","1 bedroom","2 bedroom","3 bedroom","Shop","Office"], required: true },
        { key: "furnished", label: "Furnished", type: "select", options: ["Yes","No","Semi"] },
        { key: "lease", label: "Lease term", type: "select", options: ["Monthly","6 months","Yearly"] },
        { key: "rooms", label: "Rooms", type: "number" },
      ]},
      { name: "For Sale", fields: [
        { key: "type", label: "Type", type: "select", options: ["Land","House","Flat","Commercial"], required: true },
        { key: "area_size", label: "Area", type: "text", placeholder: "e.g. 600 sqm" },
        { key: "title_type", label: "Title document", type: "select", options: ["C of O","Governor's consent","Registered survey","None"] },
      ]},
      { name: "Short Let", fields: [
        { key: "type", label: "Type", type: "select", options: ["Apartment","Room","Full house"] },
        { key: "rate", label: "Rate", type: "text", placeholder: "e.g. ₦25k/night" },
        { key: "amenities", label: "Amenities", type: "textarea", placeholder: "WiFi, pool, parking…" },
      ]},
    ],
  },
  {
    name: "Food",
    subcategories: [
      { name: "Cooked Meals", fields: [
        { key: "cuisine", label: "Cuisine", type: "text", placeholder: "e.g. Nigerian, Continental" },
        { key: "serves", label: "Serves", type: "number", placeholder: "e.g. 4 people" },
        { key: "delivery", label: "Delivery", type: "select", options: ["Yes","Pickup only"] },
      ]},
      { name: "Groceries & Produce", fields: [
        { key: "unit", label: "Unit", type: "text", placeholder: "e.g. per crate, per kg" },
        { key: "freshness", label: "Freshness", type: "select", options: ["Fresh","Frozen"] },
      ]},
      { name: "Snacks & Bakery", fields: [
        { key: "type", label: "Type", type: "text", placeholder: "e.g. cakes, pastries, chin-chin" },
        { key: "min_order", label: "Min order", type: "text", placeholder: "e.g. 1 dozen" },
      ]},
    ],
  },
  {
    name: "Health",
    subcategories: [
      { name: "Wellness & Beauty", fields: [
        { key: "type", label: "Type", type: "select", options: ["Skincare","Haircare","Supplements","Devices","Cosmetics"] },
        { key: "brand", label: "Brand", type: "text" },
        { key: "condition", label: "Condition", type: "select", options: ["New","Unopened","Like new"] },
      ]},
      { name: "Fitness Equipment", fields: [
        { key: "type", label: "Equipment", type: "text", required: true },
        { key: "condition", label: "Condition", type: "select", options: ["New","Like new","Fairly used"] },
      ]},
      { name: "Medical Supplies", fields: [
        { key: "type", label: "Type", type: "text", required: true },
        { key: "condition", label: "Condition", type: "select", options: ["New","Sealed"] },
        { key: "expiry", label: "Expiry", type: "text", placeholder: "if applicable" },
      ]},
    ],
  },
  {
    name: "Education",
    subcategories: [
      { name: "Books & Materials", fields: [
        { key: "subject", label: "Subject", type: "text" },
        { key: "level", label: "Level", type: "select", options: ["Primary","JSS","SSS","Undergraduate","Professional"] },
        { key: "condition", label: "Condition", type: "select", options: ["New","Like new","Fairly used"] },
      ]},
      { name: "Courses & Coaching", fields: [
        { key: "topic", label: "Topic", type: "text", required: true },
        { key: "format", label: "Format", type: "select", options: ["Online video","Live class","1-on-1","PDF"] },
        { key: "duration", label: "Duration", type: "text", placeholder: "e.g. 6 weeks" },
        { key: "link", label: "Course link", type: "url" },
      ]},
    ],
  },
  {
    name: "Other",
    subcategories: [
      { name: "General", fields: [
        { key: "note", label: "Extra details", type: "textarea", placeholder: "Anything buyers should know" },
      ]},
    ],
  },
];

export function subcategoriesFor(category: string | undefined): Subcategory[] {
  if (!category) return [];
  return CATEGORY_TAXONOMY.find((c) => c.name === category)?.subcategories ?? [];
}

export function fieldsFor(category: string | undefined, subcategory: string | undefined): DetailField[] {
  if (!category || !subcategory) return [];
  return subcategoriesFor(category).find((s) => s.name === subcategory)?.fields ?? [];
}

export const CURRENCIES = ["NGN", "USD", "GHS", "KES"] as const;

export const AD_STATUSES = ["active", "paused", "sold"] as const;

export const ORDER_STATUSES = ["pending", "accepted", "completed", "cancelled", "disputed"] as const;

export const PROVIDERS = ["MTN", "Airtel", "Glo", "9mobile"] as const;
export type Provider = (typeof PROVIDERS)[number];

export interface DataPlan {
  id: string;
  label: string;
  validity: string;
  price: number;
}

export const DATA_PLANS: Record<Provider, DataPlan[]> = {
  MTN: [
    { id: "mtn-500mb", label: "500MB", validity: "30 days", price: 350 },
    { id: "mtn-1gb", label: "1GB", validity: "30 days", price: 600 },
    { id: "mtn-2gb", label: "2GB", validity: "30 days", price: 1200 },
    { id: "mtn-5gb", label: "5GB", validity: "30 days", price: 2800 },
    { id: "mtn-10gb", label: "10GB", validity: "30 days", price: 5200 },
  ],
  Airtel: [
    { id: "airtel-500mb", label: "500MB", validity: "30 days", price: 340 },
    { id: "airtel-1gb", label: "1GB", validity: "30 days", price: 580 },
    { id: "airtel-2gb", label: "2GB", validity: "30 days", price: 1150 },
    { id: "airtel-5gb", label: "5GB", validity: "30 days", price: 2700 },
    { id: "airtel-10gb", label: "10GB", validity: "30 days", price: 5000 },
  ],
  Glo: [
    { id: "glo-1gb", label: "1GB", validity: "30 days", price: 500 },
    { id: "glo-2gb", label: "2GB", validity: "30 days", price: 1000 },
    { id: "glo-5gb", label: "5GB", validity: "30 days", price: 2400 },
    { id: "glo-10gb", label: "10GB", validity: "30 days", price: 4500 },
  ],
  "9mobile": [
    { id: "9m-500mb", label: "500MB", validity: "30 days", price: 300 },
    { id: "9m-1gb", label: "1GB", validity: "30 days", price: 550 },
    { id: "9m-2gb", label: "2GB", validity: "30 days", price: 1100 },
    { id: "9m-5gb", label: "5GB", validity: "30 days", price: 2600 },
  ],
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export const ADS_PER_PAGE = 10;
export const MAX_AD_IMAGES = 5;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const STORAGE_BUCKET = "ad-images";

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_WARNING_MS = 25 * 60 * 1000;
