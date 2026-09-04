import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { adSchema, type AdFormValues } from "@/lib/validators";
import {
  AD_CATEGORIES,
  fieldsFor,
  subcategoriesFor,
  type DetailField,
} from "@/lib/constants";
import { Field } from "@/components/shared/Field";
import { ImageUpload } from "./ImageUpload";
import { uploadAdImage, useSaveAd } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";
import type { Ad } from "@/lib/types";

type Errors = Partial<Record<string, string>>;

// Coerce stored jsonb details (Json) into the string map the form uses.
function toStringDetails(d: unknown): Record<string, string> {
  if (!d || typeof d !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
}

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
    category: (ad?.category ?? "") as string,
    subcategory: ad?.subcategory ?? "",
    details: toStringDetails(ad?.details),
    location: ad?.location ?? "",
  });
  const [errors, setErrors] = useState<Errors>({});

  const set =
    (k: keyof typeof values) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) =>
      setValues((v) => ({ ...v, [k]: e.target.value }));

  function setDetail(field: string, value: string) {
    setValues((v) => ({ ...v, details: { ...v.details, [field]: value } }));
  }

  // When category changes, reset subcategory and per-subcategory fields.
  function onCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const category = e.target.value;
    setValues((v) => ({
      ...v,
      category,
      subcategory: "",
      details: {},
    }));
  }

  function onSubcategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const subcategory = e.target.value;
    setValues((v) => ({ ...v, subcategory, details: {} }));
  }

  const subs = subcategoriesFor(values.category);
  const fields = fieldsFor(values.category, values.subcategory);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Errors = {};
      parsed.error.issues.forEach((i) => {
        const key = String(i.path.join("."));
        if (!errs[key]) errs[key] = i.message;
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
        <input
          id="title"
          className="input"
          maxLength={120}
          value={values.title}
          onChange={set("title")}
          placeholder="e.g. iPhone 13, 128GB, barely used"
        />
      </Field>

      <Field label="Description" htmlFor="description" error={errors.description} counter={`${values.description.length}/2000`}>
        <textarea
          id="description"
          className="input min-h-[160px] resize-y"
          maxLength={2000}
          value={values.description}
          onChange={set("description")}
          placeholder="Condition, what's included, delivery options…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Price" htmlFor="price" error={errors.price}>
          <input
            id="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="input"
            value={values.price}
            onChange={set("price")}
            placeholder="0"
          />
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
        <select id="category" className="input" value={values.category} onChange={onCategoryChange}>
          <option value="">Choose a category</option>
          {AD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      {subs.length > 0 && (
        <Field label="Subcategory" htmlFor="subcategory" error={errors.subcategory}>
          <select id="subcategory" className="input" value={values.subcategory} onChange={onSubcategoryChange}>
            <option value="">Choose a subcategory</option>
            {subs.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {fields.length > 0 && (
        <div className="panel space-y-4">
          <p className="text-sm font-semibold">Details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <DetailInput
                key={f.key}
                field={f}
                value={values.details[f.key] ?? ""}
                error={errors[`details.${f.key}`]}
                onChange={(val) => setDetail(f.key, val)}
              />
            ))}
          </div>
        </div>
      )}

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

function DetailInput({
  field,
  value,
  error,
  onChange,
}: {
  field: DetailField;
  value: string;
  error?: string;
  onChange: (val: string) => void;
}) {
  const id = `detail-${field.key}`;
  const common = {
    id,
    className: "input",
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(e.target.value),
  };
  return (
    <Field
      label={field.label}
      htmlFor={id}
      error={error}
      hint={field.hint}
    >
      {field.type === "textarea" ? (
        <textarea {...common} className="input min-h-[80px] resize-y" placeholder={field.placeholder} />
      ) : field.type === "select" && field.options ? (
        <select {...common}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "number" ? (
        <input {...common} type="number" inputMode="numeric" placeholder={field.placeholder} />
      ) : (
        <input {...common} type={field.type === "url" ? "url" : "text"} placeholder={field.placeholder} />
      )}
    </Field>
  );
}
