export const APP_NAME = "PlugZone";

// ===== Category taxonomy =====
export type FieldSpec = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "url";
  options?: readonly string[];
  hint?: string;
  required?: boolean;
};

export interface CategorySpec {
  name: string;
  subcategories: readonly string[];
  fields: readonly FieldSpec[];
}

const DELIVERY: FieldSpec = {
  key: "delivery_method",
  label: "Delivery method",
  type: "select",
  options: ["Instant (auto-delivered)", "Within 1 hour", "Within 24 hours", "Within 3 days", "Agreed in chat"],
  required: true,
};
const WARRANTY: FieldSpec = { key: "warranty", label: "Warranty / replacement", type: "select", options: ["None", "24 hours", "7 days", "30 days", "Lifetime"] };
const CREDENTIALS: FieldSpec = {
  key: "credential_type",
  label: "What the buyer receives",
  type: "select",
  options: ["Full account login", "Invite to my account", "Activation key", "Gift card / voucher code", "Shared access link"],
  required: true,
};
const REGION: FieldSpec = { key: "region", label: "Region / country restriction", type: "text", hint: "e.g. Works worldwide, Nigeria only" };
const DURATION: FieldSpec = {
  key: "duration",
  label: "Access duration",
  type: "select",
  options: ["1 month", "3 months", "6 months", "12 months", "Lifetime"],
  required: true,
};

export const CATEGORY_TAXONOMY: readonly CategorySpec[] = [
  {
    name: "Gaming",
    subcategories: ["Game Accounts", "In-Game Currency & Items", "Game Boosts & Coaching", "Game Keys & Digital Codes", "Console & PC Gaming Accessories", "Game Mods & Cheats"],
    fields: [
      { key: "game_title", label: "Game", type: "text", hint: "e.g. Fortnite, Valorant, Call of Duty", required: true },
      { key: "platform", label: "Platform", type: "select", options: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile (iOS/Android)", "Cross-platform"], required: true },
      { key: "account_level", label: "Level / rank / quantity", type: "text", hint: "e.g. Level 120, Radiant, 10,000 V-Bucks" },
      DELIVERY,
      WARRANTY,
    ],
  },
  {
    name: "VPNs & Proxies",
    subcategories: ["Residential Proxies", "Datacenter Proxies", "Mobile Proxies", "VPN Accounts", "Dedicated IPs", "SOCKS5 Proxies"],
    fields: [
      { key: "provider_name", label: "Provider / brand", type: "text", hint: "e.g. NordVPN, ExpressVPN, Bright Data", required: true },
      { key: "locations", label: "Available locations", type: "text", hint: "e.g. US, UK, Nigeria" },
      { key: "bandwidth", label: "Bandwidth / IP count", type: "text", hint: "e.g. Unlimited, 10 GB, 50 IPs" },
      DURATION,
      DELIVERY,
      WARRANTY,
    ],
  },
  {
    name: "Social Media Services",
    subcategories: ["Followers, Likes & Views", "Verified Badges / Account Verification", "Pre-aged Social Media Accounts", "Engagement Services", "Social Media Management Services"],
    fields: [
      { key: "platform", label: "Platform", type: "select", options: ["Instagram", "TikTok", "Twitter/X", "Facebook", "YouTube", "Snapchat", "LinkedIn", "Telegram", "Multiple"], required: true },
      { key: "quantity", label: "Quantity / package", type: "text", hint: "e.g. 1,000 followers, 5,000 views" },
      { key: "account_age", label: "Account age (for accounts)", type: "text", hint: "e.g. Created 2019" },
      DELIVERY,
      WARRANTY,
    ],
  },
  {
    name: "Subscriptions",
    subcategories: ["Streaming Services", "Software Licenses", "Gaming Passes", "Cloud Storage", "News & Entertainment Subscriptions", "Lifetime Software Deals"],
    fields: [
      { key: "service_name", label: "Service", type: "text", hint: "e.g. Netflix Premium, Microsoft 365, Xbox Game Pass", required: true },
      { key: "plan_tier", label: "Plan / tier", type: "text", hint: "e.g. Premium 4K, Family, Pro" },
      CREDENTIALS,
      DURATION,
      REGION,
      DELIVERY,
      WARRANTY,
    ],
  },
  {
    name: "Freelancing & Accounts",
    subcategories: ["Freelance Services", "Premium Platform Accounts", "Verified Business Accounts", "API Keys & Developer Access", "Freelance Tools & Resources"],
    fields: [
      { key: "platform", label: "Platform / service", type: "text", hint: "e.g. LinkedIn Premium, GitHub Pro, Fiverr", required: true },
      { key: "turnaround", label: "Turnaround time", type: "text", hint: "e.g. 3 business days" },
      { key: "revisions", label: "Revisions included", type: "text", hint: "e.g. 2 revisions" },
      DELIVERY,
    ],
  },
  {
    name: "Courses & Toolkits",
    subcategories: ["Online Course Access", "Educational Materials & E-books", "Professional Certifications & Study Guides", "Digital Marketing Toolkits", "SEO Software Access & Shared Accounts", "Business & Operational Templates"],
    fields: [
      { key: "provider_name", label: "Platform / author", type: "text", hint: "e.g. Udemy, Coursera, own course" },
      { key: "format", label: "Format", type: "select", options: ["Video course", "PDF / e-book", "Shared account access", "Template pack", "Live sessions"], required: true },
      { key: "file_url", label: "Preview or sample link", type: "url", hint: "Optional public link to a preview" },
      DELIVERY,
    ],
  },
  {
    name: "Verification Services",
    subcategories: ["Phone Number / SMS Verification", "Email Verification Services", "Identity / KYC Verification Assistance", "Address Verification", "Document Verification", "Platform-Specific Account Verification Services"],
    fields: [
      { key: "platform", label: "Platform to verify", type: "text", hint: "e.g. WhatsApp, Telegram, PayPal", required: true },
      { key: "countries", label: "Countries supported", type: "text", hint: "e.g. US, UK, NG" },
      { key: "turnaround", label: "Turnaround time", type: "text", hint: "e.g. 10 minutes" },
      DELIVERY,
    ],
  },
  {
    name: "Websites & Templates",
    subcategories: ["WordPress Themes & Plugins", "Shopify Templates", "Landing Page Templates", "Email Marketing Templates", "Website Scripts & Source Code", "Code Snippets", "Turnkey / Full Website Builds"],
    fields: [
      { key: "tech_stack", label: "Built with", type: "text", hint: "e.g. WordPress, Shopify Liquid, React, HTML/CSS", required: true },
      { key: "demo_url", label: "Live demo link", type: "url", hint: "Public URL buyers can preview" },
      { key: "file_url", label: "Download / file link", type: "url", hint: "Private link shared after purchase (Drive, Dropbox, GitHub)" },
      { key: "license", label: "License", type: "select", options: ["Single site", "Unlimited sites", "Personal use", "Commercial use", "Resale rights"], required: true },
      { key: "support", label: "Support included", type: "text", hint: "e.g. 30 days email support" },
    ],
  },
  {
    name: "Other Digital Services",
    subcategories: ["Health Services", "Education & Tutoring", "General Digital Services"],
    fields: [
      { key: "service_details", label: "Service format", type: "text", hint: "e.g. 1-hour video call, weekly sessions" },
      DELIVERY,
    ],
  },
] as const;

export const AD_CATEGORIES = CATEGORY_TAXONOMY.map((c) => c.name) as [string, ...string[]];

export function getCategorySpec(name: string | null | undefined): CategorySpec | undefined {
  return CATEGORY_TAXONOMY.find((c) => c.name === name);
}

export const CURRENCIES = ["NGN", "USD", "GHS", "KES"] as const;

export const AD_STATUSES = ["active", "paused", "sold"] as const;

export const ORDER_STATUSES = ["pending", "accepted", "completed", "cancelled", "disputed"] as const;

export const NEGOTIATION_MAX_ROUNDS = 5;

// ===== Telco providers =====
export const PROVIDERS = ["MTN", "Airtel", "Glo", "9mobile"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_COLORS: Record<Provider, string> = {
  MTN: "#FFCC00",
  Airtel: "#E60000",
  Glo: "#009900",
  "9mobile": "#005A36",
};

export type PlanDuration = "Daily" | "Weekly" | "Monthly" | "Social";
export const PLAN_DURATIONS: readonly PlanDuration[] = ["Daily", "Weekly", "Monthly", "Social"];

export interface DataPlan {
  id: string;
  label: string;
  validity: string;
  duration: PlanDuration;
  price: number;
  note?: string;
}

const VOLUMES = ["500MB", "1GB", "2GB", "3GB", "5GB", "10GB", "20GB", "50GB"] as const;
const VOLUME_MB: Record<(typeof VOLUMES)[number], number> = { "500MB": 500, "1GB": 1024, "2GB": 2048, "3GB": 3072, "5GB": 5120, "10GB": 10240, "20GB": 20480, "50GB": 51200 };

// Base ₦ per GB per provider for a monthly plan; daily/weekly are cheaper per plan but shorter.
const RATE_PER_GB: Record<Provider, number> = { MTN: 560, Airtel: 540, Glo: 480, "9mobile": 520 };
const DURATION_FACTOR: Record<Exclude<PlanDuration, "Social">, { factor: number; validity: string; volumes: readonly string[] }> = {
  Daily: { factor: 0.55, validity: "1 day", volumes: ["500MB", "1GB", "2GB"] },
  Weekly: { factor: 0.8, validity: "7 days", volumes: ["500MB", "1GB", "2GB", "3GB", "5GB"] },
  Monthly: { factor: 1, validity: "30 days", volumes: VOLUMES },
};

function round50(n: number) {
  return Math.max(50, Math.round(n / 50) * 50);
}

function buildPlans(provider: Provider): DataPlan[] {
  const slug = provider.toLowerCase();
  const plans: DataPlan[] = [];
  for (const dur of ["Daily", "Weekly", "Monthly"] as const) {
    const { factor, validity, volumes } = DURATION_FACTOR[dur];
    for (const v of volumes) {
      const gb = VOLUME_MB[v as (typeof VOLUMES)[number]] / 1024;
      // Larger bundles get a bulk discount
      const bulk = gb >= 20 ? 0.8 : gb >= 10 ? 0.88 : gb >= 5 ? 0.94 : 1;
      plans.push({ id: `${slug}-${dur.toLowerCase()}-${v.toLowerCase()}`, label: v, validity, duration: dur, price: round50(gb * RATE_PER_GB[provider] * factor * bulk) });
    }
  }
  const social = RATE_PER_GB[provider] * 0.45;
  plans.push(
    { id: `${slug}-social-whatsapp`, label: "WhatsApp 1GB", validity: "30 days", duration: "Social", price: round50(social), note: "WhatsApp only" },
    { id: `${slug}-social-facebook`, label: "Facebook 1GB", validity: "30 days", duration: "Social", price: round50(social), note: "Facebook only" },
    { id: `${slug}-social-instagram`, label: "Instagram 1GB", validity: "30 days", duration: "Social", price: round50(social * 1.1), note: "Instagram only" },
    { id: `${slug}-social-combo`, label: "Social Combo 2GB", validity: "30 days", duration: "Social", price: round50(social * 2), note: "WhatsApp, Facebook, Instagram" },
  );
  return plans;
}

export const DATA_PLANS: Record<Provider, DataPlan[]> = {
  MTN: buildPlans("MTN"),
  Airtel: buildPlans("Airtel"),
  Glo: buildPlans("Glo"),
  "9mobile": buildPlans("9mobile"),
};

export const AIRTIME_MIN = 50;
export const AIRTIME_MAX = 50000;

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export const ADS_PER_PAGE = 10;
export const MAX_AD_IMAGES = 5;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const STORAGE_BUCKET = "ad-images";

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_WARNING_MS = 25 * 60 * 1000;
