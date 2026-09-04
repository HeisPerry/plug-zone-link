import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { adSchema, type AdFormValues } from "@/lib/validators";
import { CATEGORY_TAXONOMY, CURRENCIES, getCategorySpec, type FieldSpec } from "@/lib/constants";
import { Field } from "@/components/shared/Field";
import { ImageUpload } from "./ImageUpload";
import { uploadAdImage, useSaveAd } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";
import type { Ad, AdDetails } from "@/lib/types";

type Errors = Partial<Record<keyof AdFormValues | "form", string>> & { details?: Record<string, string> };

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
    subcategory: ad?.subcategory ?? "",
    location: ad?.location ?? "",
  });
  const [details, setDetails] = useState<AdDetails>(() => {
    const d = ad?.details;
    return d && typeof d === "object" && !Array.isArray(d) ? Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v ?? "")])) : {};
  });
  const [images, setImages] = useState<string[]>(ad?.images ?? []);
  const [errors, setErrors] = useState<Errors>({});

  const spec = getCategorySpec(values.category);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function onCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setValues((v) => ({ ...v, category: e.target.value, subcategory: "" }));
    setDetails({});
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adSchema.safeParse(values);
    const errs: Errors = {};
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof AdFormValues;
        if (!errs[k]) errs[k] = i.message;
      });
    }
    // Category-specific required fields
    const detailErrs: Record<string, string> = {};
    for (const f of spec?.fields ?? []) {
      const v = (details[f.key] ?? "").trim();
      if (f.required && !v) detailErrs[f.key] = `${f.label} is required`;
      else if (f.type === "url" && v && !/^https?:\/\/\S+$/i.test(v)) detailErrs[f.key] = "Enter a full link starting with http:// or https://";
      else if (v.length > 300) detailErrs[f.key] = "Max 300 characters";
    }
    if (Object.keys(detailErrs).length) errs.details = detailErrs;
    if (Object.keys(errs).length || !parsed.success) {
      setErrors(errs);
      return;
    }
    setErrors({});
    // Only keep fields that belong to the chosen category
    const cleanDetails: AdDetails = {};
    for (const f of spec?.fields ?? []) {
      const v = (details[f.key] ?? "").trim();
      if (v) cleanDetails[f.key] = v;
    }
    try {
      const saved = await save.mutateAsync({ id: ad?.id, values: parsed.data, images, details: cleanDetails });
      toast.success(ad ? "Ad updated" : "Ad posted");
      navigate({ to: "/ad/$adId", params: { adId: saved.id } });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save ad" });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Field label="Title" htmlFor="title" error={errors.title} counter={`${values.title.length}/120`}>
        <input id="title" className="input" maxLength={120} value={values.title} onChange={set("title")} placeholder="e.g. Netflix Premium 4K — 3 months, private profile" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" error={errors.category}>
          <select id="category" className="input" value={values.category} onChange={onCategoryChange}>
            <option value="">Choose a category</option>
            {CATEGORY_TAXONOMY.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sub-category" htmlFor="subcategory" error={errors.subcategory}>
          <select id="subcategory" className="input" value={values.subcategory} onChange={set("subcategory")} disabled={!spec}>
            <option value="">{spec ? "Choose a sub-category" : "Pick a category first"}</option>
            {spec?.subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {spec && spec.fields.length > 0 && (
        <fieldset className="panel space-y-4 p-4 sm:p-5">
          <legend className="px-1 text-sm font-medium text-muted-foreground">{spec.name} details</legend>
          {spec.fields.map((f) => (
            <DetailField key={f.key} spec={f} value={details[f.key] ?? ""} error={errors.details?.[f.key]} onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} />
          ))}
        </fieldset>
      )}

      <Field label="Description" htmlFor="description" error={errors.description} counter={`${values.description.length}/2000`}>
        <textarea id="description" className="input min-h-[160px] resize-y" maxLength={2000} value={values.description} onChange={set("description")} placeholder="What's included, conditions, how delivery works…" />
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

      <div>
        <span className="label">Photos or screenshots</span>
        <ImageUpload images={images} onChange={setImages} upload={(f) => uploadAdImage(user!.id, f)} />
      </div>

      <Field label="Location (optional)" htmlFor="location" error={errors.location} hint="City or area, e.g. Ikeja, Lagos — leave blank for fully digital items">
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

function DetailField({ spec, value, error, onChange }: { spec: FieldSpec; value: string; error?: string | undefined; onChange: (v: string) => void }) {
  const id = `detail-${spec.key}`;
  const label = spec.required ? spec.label : `${spec.label} (optional)`;
  return (
    <Field label={label} htmlFor={id} error={error} hint={spec.hint}>
      {spec.type === "select" ? (
        <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select</option>
          {spec.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : spec.type === "textarea" ? (
        <textarea id={id} className="input min-h-[90px]" maxLength={300} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={spec.type === "url" ? "url" : "text"} className="input" maxLength={300} value={value} onChange={(e) => onChange(e.target.value)} placeholder={spec.type === "url" ? "https://" : undefined} />
      )}
    </Field>
  );
}
