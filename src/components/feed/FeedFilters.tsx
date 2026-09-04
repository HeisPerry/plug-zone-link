import { Search, X } from "lucide-react";
import { CATEGORY_TAXONOMY, getCategorySpec } from "@/lib/constants";
import type { FeedFilters as Filters } from "@/hooks/useDashboardFeed";

export function FeedFilters({ value, onChange, onClear }: { value: Filters; onChange: (next: Filters) => void; onClear: () => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  const isDirty = value.search !== "" || value.category !== "all" || value.subcategory !== "all" || value.minPrice !== "" || value.maxPrice !== "";
  const spec = getCategorySpec(value.category);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search listings"
            aria-label="Search listings"
            className="input pl-10"
          />
        </div>
        <select value={value.category} onChange={(e) => set({ category: e.target.value, subcategory: "all" })} aria-label="Category" className="input md:w-52">
          <option value="all">All categories</option>
          {CATEGORY_TAXONOMY.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        {spec && (
          <select value={value.subcategory} onChange={(e) => set({ subcategory: e.target.value })} aria-label="Sub-category" className="input md:w-60">
            <option value="all">All {spec.name}</option>
            {spec.subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.minPrice}
          onChange={(e) => set({ minPrice: e.target.value })}
          placeholder="Min price"
          aria-label="Minimum price"
          className="input w-32"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.maxPrice}
          onChange={(e) => set({ maxPrice: e.target.value })}
          placeholder="Max price"
          aria-label="Maximum price"
          className="input w-32"
        />
        {isDirty && (
          <button type="button" onClick={onClear} className="btn btn-ghost btn-sm ml-auto">
            <X size={16} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <button type="button" onClick={() => set({ category: "all", subcategory: "all" })} className="badge shrink-0" data-active={value.category === "all"}>
          All
        </button>
        {CATEGORY_TAXONOMY.map((c) => (
          <button key={c.name} type="button" onClick={() => set({ category: c.name, subcategory: "all" })} className="badge shrink-0" data-active={value.category === c.name}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
