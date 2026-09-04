import { Search, X } from "lucide-react";
import { AD_CATEGORIES } from "@/lib/constants";
import type { FeedFilters as Filters } from "@/hooks/useDashboardFeed";

export function FeedFilters({ value, onChange, onClear }: { value: Filters; onChange: (next: Filters) => void; onClear: () => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  const isDirty = value.search !== "" || value.category !== "all" || value.minPrice !== "" || value.maxPrice !== "";

  return (
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
      <select value={value.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category" className="input md:w-44">
        <option value="all">All categories</option>
        {AD_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.minPrice}
          onChange={(e) => set({ minPrice: e.target.value })}
          placeholder="Min price"
          aria-label="Minimum price"
          className="input md:w-32"
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
          className="input md:w-32"
        />
      </div>
      {isDirty && (
        <button type="button" onClick={onClear} className="btn btn-ghost btn-sm self-start md:self-auto">
          <X size={16} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
