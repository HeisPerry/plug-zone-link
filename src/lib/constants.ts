export const APP_NAME = "PlugZone";

export const AD_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Services",
  "Vehicles",
  "Property",
  "Food",
  "Health",
  "Education",
  "Other",
] as const;

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
