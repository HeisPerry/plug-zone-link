import { z } from "zod";
import { AD_CATEGORIES, CURRENCIES, fieldsFor, subcategoriesFor } from "./constants";

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

export const isEmailLike = (v: string) => v.includes("@");

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your username or email")
    .max(255)
    .refine((v) => (isEmailLike(v) ? z.string().email().safeParse(v).success : usernameSchema.safeParse(v).success), {
      message: "Enter a valid username or email",
    }),
  password: z.string().min(1, "Enter your password"),
});

export const adSchema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(120, "Max 120 characters"),
    description: z.string().trim().min(10, "Describe the item in more detail").max(2000, "Max 2000 characters"),
    price: z.coerce.number().min(0, "Price cannot be negative"),
    currency: z.enum(CURRENCIES),
    category: z.enum(AD_CATEGORIES, { errorMap: () => ({ message: "Pick a category" }) }),
    subcategory: z.string().trim().max(60).optional().or(z.literal("")),
    details: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    const subs = subcategoriesFor(data.category);
    if (subs.length > 0) {
      if (!data.subcategory) {
        ctx.addIssue({ path: ["subcategory"], code: z.ZodIssueCode.custom, message: "Pick a subcategory" });
      } else if (!subs.some((s) => s.name === data.subcategory)) {
        ctx.addIssue({ path: ["subcategory"], code: z.ZodIssueCode.custom, message: "Invalid subcategory for this category" });
      }
    }
    const fields = fieldsFor(data.category, data.subcategory);
    const details = data.details ?? {};
    for (const f of fields) {
      const val = (details[f.key] ?? "").trim();
      if (f.required && !val) {
        ctx.addIssue({ path: [`details.${f.key}`], code: z.ZodIssueCode.custom, message: `${f.label} is required` });
      }
    }
  });
export type AdFormValues = z.infer<typeof adSchema>;

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
