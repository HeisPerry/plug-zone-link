import { z } from "zod";
import { AD_CATEGORIES, CURRENCIES } from "./constants";

export const passwordRules = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const passwordSchema = z
  .string()
  .refine((p) => passwordRules.every((r) => r.test(p)), "Password does not meet all requirements");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(20, "At most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only");

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2, "Enter your name").max(60),
    username: usernameSchema,
    email: z.string().trim().email("Enter a valid email").max(255),
    password: passwordSchema,
    confirmPassword: z.string(),
    referralCode: z.string().trim().max(12).optional().or(z.literal("")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const adSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120, "Max 120 characters"),
  description: z.string().trim().min(10, "Describe the item in more detail").max(2000, "Max 2000 characters"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  currency: z.enum(CURRENCIES),
  category: z.enum(AD_CATEGORIES, { errorMap: () => ({ message: "Pick a category" }) }),
  subcategory: z.string().trim().min(1, "Pick a sub-category").max(80),
  location: z.string().trim().max(120).optional().or(z.literal("")),
});
export type AdFormValues = z.infer<typeof adSchema>;

export const offerSchema = z.object({
  price: z.coerce.number().positive("Enter an amount above zero"),
  message: z.string().trim().max(300, "Max 300 characters").optional().or(z.literal("")),
});

export const savedContactSchema = z.object({
  label: z.string().trim().min(1, "Give this number a name").max(40, "Max 40 characters"),
  phone_number: z.string().regex(/^0\d{10}$/, "Enter an 11-digit number starting with 0"),
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Enter your name").max(60),
  bio: z.string().trim().max(300, "Max 300 characters").optional().or(z.literal("")),
  phone_number: z
    .string()
    .trim()
    .regex(/^(0\d{10})?$/, "Enter an 11-digit Nigerian number")
    .optional()
    .or(z.literal("")),
});

export const nigerianPhone = z.string().regex(/^0\d{10}$/, "Enter an 11-digit number starting with 0");

export const airtimeAmount = z.coerce
  .number()
  .min(50, "Minimum is ₦50")
  .max(50000, "Maximum is ₦50,000");
