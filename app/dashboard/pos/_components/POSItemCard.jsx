"use client";

import { getItemPrice, getItemSizeLabel } from "./constants";
import { MdAdd } from "react-icons/md";

export default function POSItemCard({ item, onAdd }) {
  const price = getItemPrice(item);
  const sizeLabel = getItemSizeLabel(item);

  return (
    <button
      onClick={() => onAdd(item)}
      className="group flex flex-col overflow-hidden rounded-xl border border-brand-sand bg-white text-left transition-all hover:border-p-red/40 hover:shadow-md hover:shadow-red-900/8 active:scale-[0.97]"
    >
      {item.image && (
        <div className="h-20 w-full overflow-hidden bg-brand-petal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-2.5">
        <p className="text-[13px] font-bold leading-tight text-brand-espresso line-clamp-2">
          {item.name}
        </p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <div>
            <span className="text-base font-extrabold text-brand-gold">
              ${price.toFixed(2)}
            </span>
            {sizeLabel && (
              <span className="ml-1 text-[10px] font-medium text-brand-warm">
                {sizeLabel}
              </span>
            )}
          </div>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-p-red/10 text-p-red group-hover:bg-p-red group-hover:text-white transition-colors">
            <MdAdd className="text-xs" />
          </span>
        </div>
      </div>
    </button>
  );
}
