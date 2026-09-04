import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { adSchema, type AdFormValues } from "@/lib/validators";
import { AD_CATEGORIES, CURRENCIES } from "@/lib/constants";
import { Field } from "@/components/shared/Field";
import { ImageUpload } from "./ImageUpload";
import { uploadAdImage, useSaveAd } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";
import type { Ad } from "@/lib/types";

type Errors = Partial<Record<keyof AdFormValues | "form", string>>;

export function AdForm({ ad }: { ad?: Ad }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const save = useSaveAd();
  const [values, setValues] = useState({
    title: ad?.title ?? "",
    description: ad?.description ?? "",
    price: ad ? String(ad.price) : "",
    currency: (ad?.currency ?? "NGN") as (typeof CURRENCIES)[number],
    category: ad?.category ?? "",
    location: ad?.location ?? "",
  });
  const [images, setImages] = useState<string[]>(ad?.images ?? []);
  const [errors, setErrors] = useState<Errors>({});

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof Errors;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      const saved = await save.mutateAsync({ id: ad?.id, values: parsed.data, images });
      toast.success(ad ? "Ad updated" : "Ad posted");
      navigate({ to: "/ad/$adId", params: { adId: saved.id } });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save ad" });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Field label="Title" htmlFor="title" error={errors.title} counter={`${values.title.length}/120`}>
        <input id="title" className="input" maxLength={120} value={values.title} onChange={set("title")} placeholder="e.g. iPhone 13, 128GB, barely used" />
      </Field>

      <Field label="Description" htmlFor="description" error={errors.description} counter={`${values.description.length}/2000`}>
        <textarea id="description" className="input min-h-[160px] resize-y" maxLength={2000} value={values.description} onChange={set("description")} placeholder="Condition, what's included, delivery options…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Price" htmlFor="price" error={errors.price}>
          <input id="price" type="number" inputMode="decimal" min={0} step="0.01" className="input" value={values.price} onChange={set("price")} placeholder="0" />
        </Field>
        <Field label="Currency" htmlFor="currency" error={errors.currency}>
          <select id="currency" className="input" value={values.currency} onChange={set("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Category" htmlFor="category" error={errors.category}>
        <select id="category" className="input" value={values.category} onChange={set("category")}>
          <option value="">Choose a category</option>
          {AD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <span className="label">Photos</span>
        <ImageUpload images={images} onChange={setImages} upload={(f) => uploadAdImage(user!.id, f)} />
      </div>

      <Field label="Location" htmlFor="location" error={errors.location} hint="City or area, e.g. Ikeja, Lagos">
        <input id="location" className="input" value={values.location} onChange={set("location")} />
      </Field>

      {errors.form && <p className="field-error">{errors.form}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : ad ? "Update Ad" : "Post Ad"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
