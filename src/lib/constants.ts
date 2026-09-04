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

// 9-category digital-services taxonomy. Each subcategory carries its own
// dynamic fields, stored as JSONB in ads.details.
export const CATEGORY_TAXONOMY: CategorySpec[] = [
  {
    name: "Gaming",
    subcategories: [
      { name: "Game Accounts", fields: [
        { key: "game", label: "Game", type: "select", options: ["Fortnite","Valorant","Call of Duty","Apex Legends","Genshin Impact","League of Legends","CS2","PUBG","Roblox","Other"], required: true },
        { key: "rank", label: "Rank / Level", type: "text", placeholder: "e.g. Diamond / Lv 120" },
        { key: "platform", label: "Platform", type: "select", options: ["PC","PlayStation","Xbox","Mobile","Nintendo","Cross-platform"] },
        { key: "region", label: "Region", type: "text", placeholder: "e.g. EU, NA, Asia" },
        { key: "delivery", label: "Delivery method", type: "select", options: ["Full access","Credentials only","Email change"] },
      ]},
      { name: "In-Game Currency & Items", fields: [
        { key: "game", label: "Game", type: "text", required: true },
        { key: "item", label: "Item / Currency", type: "text", placeholder: "e.g. 10,000 V-Bucks", required: true },
        { key: "quantity", label: "Quantity", type: "text", placeholder: "e.g. 100x" },
        { key: "delivery", label: "Delivery", type: "select", options: ["In-game trade","Mail","Gift","Code"] },
      ]},
      { name: "Game Boosts & Coaching", fields: [
        { key: "service", label: "Service", type: "select", options: ["Rank boost","Leveling","Coaching","Account leveling"], required: true },
        { key: "game", label: "Game", type: "text", required: true },
        { key: "from_rank", label: "From rank", type: "text" },
        { key: "to_rank", label: "To rank", type: "text" },
        { key: "eta", label: "Estimated time", type: "text", placeholder: "e.g. 3 days" },
      ]},
      { name: "Game Keys & Digital Codes", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["Steam","Epic Games","Origin","Uplay","GOG","Xbox","PlayStation","Nintendo","Other"], required: true },
        { key: "title", label: "Game title", type: "text", required: true },
        { key: "region", label: "Region", type: "text" },
        { key: "format", label: "Format", type: "select", options: ["CD key","Gift link","Account"] },
      ]},
      { name: "Console & PC Gaming Accessories", fields: [
        { key: "type", label: "Accessory", type: "select", options: ["Controller","Headset","Keyboard","Mouse","Mousepad","Charging dock","Other"], required: true },
        { key: "brand", label: "Brand", type: "text" },
        { key: "platform", label: "Platform", type: "select", options: ["PC","PlayStation","Xbox","Nintendo","Universal"] },
        { key: "condition", label: "Condition", type: "select", options: ["New","Like new","Fairly used"] },
      ]},
      { name: "Game Mods & Cheats", fields: [
        { key: "game", label: "Game", type: "text", required: true },
        { key: "mod_type", label: "Mod / Cheat type", type: "select", options: ["ESP / Wallhack","Aimbot","Skin mod","Menu mod","Trainer","Other"], required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 day","7 days","30 days","Lifetime"] },
        { key: "platform", label: "Platform", type: "text" },
      ]},
    ],
  },
  {
    name: "VPNs & Proxies",
    subcategories: [
      { name: "Residential Proxies", fields: [
        { key: "bandwidth", label: "Bandwidth", type: "text", placeholder: "e.g. 10GB", required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 day","7 days","30 days","90 days","Lifetime"] },
        { key: "region", label: "Region(s)", type: "text", placeholder: "e.g. US, EU, Global" },
        { key: "rotating", label: "Rotating", type: "select", options: ["Yes","No","Sticky"] },
      ]},
      { name: "Datacenter Proxies", fields: [
        { key: "count", label: "IP count", type: "number", placeholder: "e.g. 100", required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 day","7 days","30 days","Lifetime"] },
        { key: "region", label: "Region(s)", type: "text" },
      ]},
      { name: "Mobile Proxies", fields: [
        { key: "network", label: "Carrier", type: "text", placeholder: "e.g. AT&T, MTN" },
        { key: "bandwidth", label: "Bandwidth", type: "text", required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 day","7 days","30 days","Lifetime"] },
        { key: "region", label: "Region", type: "text" },
      ]},
      { name: "VPN Accounts", fields: [
        { key: "provider", label: "Provider", type: "select", options: ["ExpressVPN","NordVPN","Surfshark","CyberGhost","Private Internet Access","ProtonVPN","Other"], required: true },
        { key: "plan", label: "Plan", type: "select", options: ["1 month","6 months","1 year","2 years","Lifetime"] },
        { key: "devices", label: "Devices", type: "number", placeholder: "e.g. 5" },
      ]},
      { name: "Dedicated IPs", fields: [
        { key: "type", label: "IP type", type: "select", options: ["IPv4","IPv6","Dual"], required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 day","7 days","30 days","Lifetime"] },
        { key: "region", label: "Region", type: "text" },
      ]},
      { name: "SOCKS5 Proxies", fields: [
        { key: "count", label: "IP count", type: "number", required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 day","7 days","30 days","Lifetime"] },
        { key: "auth", label: "Authentication", type: "select", options: ["User/pass","IP whitelist"] },
      ]},
    ],
  },
  {
    name: "Social Media Services",
    subcategories: [
      { name: "Followers, Likes & Views", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["Instagram","TikTok","Twitter/X","YouTube","Facebook","Telegram","Other"], required: true },
        { key: "service", label: "Service", type: "select", options: ["Followers","Likes","Views","Comments","Shares","Combo"], required: true },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "e.g. 1000", required: true },
        { key: "speed", label: "Delivery speed", type: "select", options: ["Instant","Gradual","Drip-feed"] },
      ]},
      { name: "Verified Badges / Account Verification", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["Instagram","Twitter/X","Facebook","TikTok","YouTube","Other"], required: true },
        { key: "method", label: "Method", type: "select", options: ["PR","Manual review","Partner portal","Other"] },
        { key: "eta", label: "Estimated time", type: "text", placeholder: "e.g. 7-14 days" },
      ]},
      { name: "Pre-aged Social Media Accounts", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["Instagram","Twitter/X","Facebook","TikTok","Reddit","LinkedIn","Other"], required: true },
        { key: "age", label: "Account age", type: "text", placeholder: "e.g. 2 years", required: true },
        { key: "followers", label: "Followers", type: "number" },
        { key: "email_included", label: "Email included", type: "select", options: ["Yes","No"] },
      ]},
      { name: "Engagement Services", fields: [
        { key: "platform", label: "Platform", type: "text", required: true },
        { key: "service", label: "Service", type: "select", options: ["Story views","Saves","Poll votes","DMs","Comments","Combo"], required: true },
        { key: "quantity", label: "Quantity", type: "number", required: true },
      ]},
      { name: "Social Media Management", fields: [
        { key: "platform", label: "Platform(s)", type: "text", required: true },
        { key: "service", label: "Service", type: "select", options: ["Content creation","Scheduling","Full management","Growth"], required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 week","1 month","3 months","Custom"] },
      ]},
    ],
  },
  {
    name: "Subscriptions",
    subcategories: [
      { name: "Streaming Services", fields: [
        { key: "provider", label: "Provider", type: "select", options: ["Netflix","Spotify","Disney+","HBO Max","Apple Music","Amazon Prime","YouTube Premium","Hulu","Other"], required: true },
        { key: "plan", label: "Plan", type: "select", options: ["1 month","3 months","6 months","1 year","Lifetime"] },
        { key: "screen", label: "Screens / Quality", type: "text", placeholder: "e.g. 4K, 4 screens" },
        { key: "region", label: "Region", type: "text" },
      ]},
      { name: "Software Licenses", fields: [
        { key: "provider", label: "Software", type: "select", options: ["Adobe Creative Cloud","Microsoft 365","Canva","AutoCAD","Final Cut Pro","Other"], required: true },
        { key: "plan", label: "Plan", type: "select", options: ["1 month","1 year","Lifetime"] },
        { key: "seats", label: "Seats", type: "number", placeholder: "e.g. 1" },
      ]},
      { name: "Gaming Passes", fields: [
        { key: "provider", label: "Pass", type: "select", options: ["Xbox Game Pass","PlayStation Plus","EA Play","Nintendo Online","Ubisoft+","Other"], required: true },
        { key: "tier", label: "Tier", type: "select", options: ["Core","Extra","Premium","Ultimate"] },
        { key: "duration", label: "Duration", type: "select", options: ["1 month","3 months","1 year"] },
      ]},
      { name: "Cloud Storage", fields: [
        { key: "provider", label: "Provider", type: "select", options: ["Google Drive","Dropbox","OneDrive","iCloud","Mega","Other"], required: true },
        { key: "capacity", label: "Capacity", type: "text", placeholder: "e.g. 2TB", required: true },
        { key: "duration", label: "Duration", type: "select", options: ["1 month","1 year","Lifetime"] },
      ]},
      { name: "News & Entertainment Subscriptions", fields: [
        { key: "provider", label: "Provider", type: "text", required: true },
        { key: "plan", label: "Plan", type: "select", options: ["1 month","6 months","1 year","Lifetime"] },
        { key: "region", label: "Region", type: "text" },
      ]},
      { name: "Lifetime Software Deals", fields: [
        { key: "software", label: "Software", type: "text", required: true },
        { key: "seats", label: "Seats", type: "number" },
        { key: "transfer", label: "Transfer method", type: "select", options: ["Account","License key","Email change"] },
      ]},
    ],
  },
  {
    name: "Freelancing & Accounts",
    subcategories: [
      { name: "Freelance Services", fields: [
        { key: "service", label: "Service", type: "select", options: ["Design","Writing","Software Development","Video editing","Marketing","Voiceover","Other"], required: true },
        { key: "portfolio", label: "Portfolio link", type: "url" },
        { key: "turnaround", label: "Turnaround", type: "text", placeholder: "e.g. 3 days" },
        { key: "revisions", label: "Revisions", type: "number", placeholder: "e.g. 2" },
      ]},
      { name: "Premium Platform Accounts", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["LinkedIn Premium","GitHub Pro","ChatGPT Plus","Coursera Plus","Skillshare","Other"], required: true },
        { key: "plan", label: "Plan", type: "select", options: ["1 month","3 months","1 year","Lifetime"] },
      ]},
      { name: "Verified Business Accounts", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["Google Business","Facebook Business","Instagram Business","WhatsApp Business","TikTok Business","Other"], required: true },
        { key: "verified", label: "Verification", type: "select", options: ["Blue badge","Grey badge","Unverified"] },
        { key: "age", label: "Account age", type: "text" },
      ]},
      { name: "API Keys & Developer Access", fields: [
        { key: "service", label: "Service / API", type: "text", required: true },
        { key: "tier", label: "Tier", type: "text", placeholder: "e.g. Pro, Enterprise" },
        { key: "quota", label: "Quota / Rate limit", type: "text", placeholder: "e.g. 1M calls/mo" },
        { key: "duration", label: "Duration", type: "select", options: ["1 month","1 year","Lifetime"] },
      ]},
      { name: "Freelance Tools & Resources", fields: [
        { key: "tool", label: "Tool", type: "text", required: true },
        { key: "format", label: "Format", type: "select", options: ["Account","Template","Presets","Bundle"] },
        { key: "duration", label: "Duration", type: "select", options: ["1 month","1 year","Lifetime"] },
      ]},
    ],
  },
  {
    name: "Courses & Toolkits",
    subcategories: [
      { name: "Online Course Access", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["Udemy","Coursera","Custom video","Skillshare","Pluralsight","Other"], required: true },
        { key: "topic", label: "Topic", type: "text", required: true },
        { key: "duration", label: "Duration", type: "text", placeholder: "e.g. 12 hours" },
        { key: "access", label: "Access", type: "select", options: ["Lifetime","1 year","1 month"] },
        { key: "link", label: "Course link", type: "url" },
      ]},
      { name: "Educational Materials & E-books", fields: [
        { key: "subject", label: "Subject", type: "text", required: true },
        { key: "format", label: "Format", type: "select", options: ["PDF","EPUB","Video","Audio","Bundle"] },
        { key: "pages", label: "Length", type: "text", placeholder: "e.g. 240 pages" },
      ]},
      { name: "Professional Certifications & Study Guides", fields: [
        { key: "cert", label: "Certification", type: "text", placeholder: "e.g. AWS, PMP, CCNA", required: true },
        { key: "format", label: "Format", type: "select", options: ["Practice tests","Study guide","Video course","Bundle"] },
        { key: "year", label: "Edition year", type: "number" },
      ]},
      { name: "Digital Marketing Toolkits", fields: [
        { key: "topic", label: "Topic", type: "select", options: ["SEO","Social media","Email marketing","Paid ads","Affiliate","Combo"], required: true },
        { key: "format", label: "Format", type: "select", options: ["Templates","Swipe files","Guides","Bundle"] },
      ]},
      { name: "SEO Software Access & Shared Accounts", fields: [
        { key: "tool", label: "Tool", type: "select", options: ["Ahrefs","SEMrush","Moz","Ubersuggest","Other"], required: true },
        { key: "plan", label: "Plan", type: "text" },
        { key: "duration", label: "Duration", type: "select", options: ["1 day","7 days","30 days","Lifetime"] },
      ]},
      { name: "Business & Operational Templates", fields: [
        { key: "type", label: "Template type", type: "select", options: ["Business plan","Invoice","Proposal","Spreadsheet","Notion template","Other"], required: true },
        { key: "format", label: "Format", type: "select", options: ["Excel","Docs","Notion","PDF","Bundle"] },
      ]},
    ],
  },
  {
    name: "Verification Services",
    subcategories: [
      { name: "Phone Number / SMS Verification", fields: [
        { key: "country", label: "Country", type: "text", required: true },
        { key: "service", label: "Service", type: "select", options: ["OTP","Rent number","SMS receive","Voice verify"] },
        { key: "duration", label: "Duration", type: "text", placeholder: "e.g. 10 min, 7 days" },
      ]},
      { name: "Email Verification Services", fields: [
        { key: "service", label: "Service", type: "select", options: ["OTP","Account creation","Recovery link"], required: true },
        { key: "provider", label: "Email provider", type: "text" },
        { key: "quantity", label: "Quantity", type: "number" },
      ]},
      { name: "Identity / KYC Verification Assistance", fields: [
        { key: "service", label: "Service", type: "select", options: ["Document prep","Verification guidance","Account setup","Other"], required: true },
        { key: "platform", label: "Platform", type: "text" },
        { key: "eta", label: "Estimated time", type: "text" },
      ]},
      { name: "Address Verification", fields: [
        { key: "country", label: "Country", type: "text", required: true },
        { key: "service", label: "Service", type: "select", options: ["Utility bill","Bank statement","Proof of address"] },
        { key: "format", label: "Format", type: "select", options: ["Digital","Physical"] },
      ]},
      { name: "Document Verification", fields: [
        { key: "doc_type", label: "Document type", type: "select", options: ["ID card","Passport","Driver license","Utility bill","Other"], required: true },
        { key: "country", label: "Country", type: "text" },
        { key: "format", label: "Format", type: "select", options: ["Scan","Photo","Digital"] },
      ]},
      { name: "Platform-Specific Account Verification", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["PayPal","Stripe","Coinbase","Binance","Amazon","Other"], required: true },
        { key: "level", label: "Level", type: "select", options: ["Basic","Verified","Business","Premium"] },
        { key: "eta", label: "Estimated time", type: "text" },
      ]},
    ],
  },
  {
    name: "Websites & Templates",
    subcategories: [
      { name: "WordPress Themes & Plugins", fields: [
        { key: "type", label: "Type", type: "select", options: ["Theme","Plugin","Bundle"], required: true },
        { key: "name", label: "Name", type: "text" },
        { key: "license", label: "License", type: "select", options: ["Single site","5 sites","Lifetime","Developer"] },
      ]},
      { name: "Shopify Templates", fields: [
        { key: "name", label: "Template name", type: "text", required: true },
        { key: "niche", label: "Niche", type: "text", placeholder: "e.g. Fashion, Electronics" },
        { key: "license", label: "License", type: "select", options: ["Single store","Multiple","Lifetime"] },
      ]},
      { name: "Landing Page Templates", fields: [
        { key: "niche", label: "Niche", type: "text", required: true },
        { key: "format", label: "Format", type: "select", options: ["HTML","React","Figma","Webflow"] },
        { key: "pages", label: "Pages", type: "number", placeholder: "e.g. 5" },
      ]},
      { name: "Email Marketing Templates", fields: [
        { key: "platform", label: "Platform", type: "select", options: ["Mailchimp","Klaviyo","Brevo","HTML","Other"], required: true },
        { key: "niche", label: "Niche", type: "text" },
        { key: "count", label: "Template count", type: "number" },
      ]},
      { name: "Website Scripts & Source Code", fields: [
        { key: "type", label: "Script type", type: "select", options: ["PHP","Node.js","Python","SaaS","Other"], required: true },
        { key: "name", label: "Name", type: "text" },
        { key: "license", label: "License", type: "select", options: ["Single","Developer","Resale"] },
      ]},
      { name: "Code Snippets", fields: [
        { key: "language", label: "Language", type: "select", options: ["JavaScript","TypeScript","Python","PHP","Go","Other"], required: true },
        { key: "purpose", label: "Purpose", type: "text", placeholder: "e.g. auth, payment" },
        { key: "format", label: "Format", type: "select", options: ["Snippet","Component","Module"] },
      ]},
      { name: "Turnkey / Full Website Builds", fields: [
        { key: "niche", label: "Niche", type: "text", required: true },
        { key: "stack", label: "Tech stack", type: "text", placeholder: "e.g. Next.js + Supabase" },
        { key: "features", label: "Features", type: "textarea", placeholder: "Auth, payments, admin…" },
        { key: "transfer", label: "Transfer", type: "select", options: ["Files","Repo access","Hosted"] },
      ]},
    ],
  },
  {
    name: "Other Digital Services",
    subcategories: [
      { name: "Health Services", fields: [
        { key: "service", label: "Service", type: "select", options: ["Teleconsultation","Wellness plan","Diet plan","Mental health","Other"], required: true },
        { key: "format", label: "Format", type: "select", options: ["Online","PDF","Video","1-on-1"] },
        { key: "duration", label: "Duration", type: "text" },
      ]},
      { name: "Education & Tutoring", fields: [
        { key: "subject", label: "Subject", type: "text", required: true },
        { key: "level", label: "Level", type: "select", options: ["Beginner","Intermediate","Advanced","Professional"] },
        { key: "mode", label: "Mode", type: "select", options: ["Online","In-person","Hybrid"] },
      ]},
      { name: "General Digital Services", fields: [
        { key: "service", label: "Service", type: "text", required: true },
        { key: "format", label: "Format", type: "select", options: ["One-off","Subscription","Package"] },
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
