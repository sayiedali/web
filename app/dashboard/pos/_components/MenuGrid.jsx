"use client";

import { MdSearch } from "react-icons/md";
import POSItemCard from "./POSItemCard";

export default function MenuGrid({
  items,
  loading,
  searchTerm,
  onSearchChange,
  onAdd,
}) {
  return (
    <div className="flex flex-1 min-w-0 flex-col bg-brand-cream">
      {/* Search Bar */}
      <div className="shrink-0 border-b border-brand-sand bg-white px-4 py-2.5">
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-warm text-lg" />
          <input
            type="text"
            placeholder="Search all menu items... (press / to focus)"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            data-pos-search="true"
            className="w-full rounded-lg border border-brand-sand bg-brand-petal py-2 pl-10 pr-4 text-sm text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/30 transition"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-p-red border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-brand-warm">
            <span className="mb-2 text-4xl">🍽️</span>
            <p className="text-sm font-medium">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <POSItemCard key={item._id} item={item} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
