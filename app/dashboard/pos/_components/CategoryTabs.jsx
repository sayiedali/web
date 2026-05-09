"use client";

import { CATEGORIES } from "./constants";

export default function CategoryTabs({ activeCategory, onSelect }) {
  return (
    <div className="shrink-0 flex gap-1.5 overflow-x-auto border-b border-brand-sand bg-white px-3 py-2.5 no-scrollbar shadow-sm">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            activeCategory === cat.key
              ? "bg-p-red text-white shadow-md shadow-red-900/20"
              : "bg-brand-petal text-brand-warm hover:bg-brand-sand hover:text-brand-espresso border border-brand-sand"
          }`}
        >
          {cat.emoji} {cat.label}
        </button>
      ))}
    </div>
  );
}
