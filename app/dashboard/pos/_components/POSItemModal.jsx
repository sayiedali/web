"use client";

import { useEffect, useMemo, useState } from "react";
import { MdClose, MdAdd, MdRemove } from "react-icons/md";
import { getToppingPrice } from "./constants";

const SIZE_KEYS = ["small", "medium", "large", "extralarge"];

const pickDefault = (options = []) => {
  if (!options.length) return null;
  return options.find((o) => o.isDefault) || options[0];
};

const getInitialSize = (item) => {
  if (Array.isArray(item.sizeOptions) && item.sizeOptions.length) {
    const d = item.sizeOptions.find((s) => s.isDefault) || item.sizeOptions[0];
    return { key: d.key, label: d.label, price: Number(d.price) || 0 };
  }
  if (item.prices && typeof item.prices === "object") {
    for (const key of SIZE_KEYS) {
      if (item.prices[key]) {
        const label =
          (item.size && item.size[key]) ||
          key.charAt(0).toUpperCase() + key.slice(1);
        return { key, label, price: Number(item.prices[key]) || 0 };
      }
    }
  }
  return null;
};

const getSizeList = (item) => {
  if (Array.isArray(item.sizeOptions) && item.sizeOptions.length) {
    return item.sizeOptions.map((s) => ({
      key: s.key,
      label: s.label,
      price: Number(s.price) || 0,
    }));
  }
  if (item.prices && typeof item.prices === "object") {
    return SIZE_KEYS.filter((k) => item.prices[k]).map((k) => ({
      key: k,
      label:
        (item.size && item.size[k]) ||
        k.charAt(0).toUpperCase() + k.slice(1),
      price: Number(item.prices[k]) || 0,
    }));
  }
  return [];
};

export default function POSItemModal({ open, item, onClose, onConfirm }) {
  const [size, setSize] = useState(null);
  const [crust, setCrust] = useState(null);
  const [cheese, setCheese] = useState(null);
  const [sauce, setSauce] = useState(null);
  const [extraToppings, setExtraToppings] = useState([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!item) return;
    setSize(getInitialSize(item));
    setCrust(pickDefault(item.crustOptions));
    setCheese(pickDefault(item.cheeseOptions));
    setSauce(pickDefault(item.sauces));
    setExtraToppings([]);
    setQty(1);
  }, [item]);

  const sizeList = useMemo(() => (item ? getSizeList(item) : []), [item]);
  const toppingList = useMemo(
    () => (Array.isArray(item?.toppings) ? item.toppings : []),
    [item]
  );

  const toppingUnitPrice = useMemo(() => getToppingPrice(size?.key), [size]);

  const unitPrice = useMemo(() => {
    const base = size?.price || 0;
    const c = Number(crust?.price) || 0;
    const ch = Number(cheese?.price) || 0;
    const sc = Number(sauce?.price) || 0;
    const t = extraToppings.length * toppingUnitPrice;
    return base + c + ch + sc + t;
  }, [size, crust, cheese, sauce, extraToppings, toppingUnitPrice]);

  const lineTotal = unitPrice * qty;

  if (!open || !item) return null;

  const toggleTopping = (name) => {
    setExtraToppings((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleConfirm = () => {
    onConfirm({ item, size, crust, cheese, sauce, extraToppings, qty, unitPrice });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-espresso/40 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-brand-sand">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-brand-sand px-5 py-4 bg-brand-petal">
          <div>
            <h3 className="text-base font-extrabold text-brand-espresso">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-brand-warm line-clamp-1 mt-0.5">
                {item.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sand text-brand-warm hover:bg-brand-espresso hover:text-white transition-colors"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Size */}
          {sizeList.length > 0 && (
            <Section title="Size">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sizeList.map((s) => (
                  <Chip
                    key={s.key}
                    active={size?.key === s.key}
                    onClick={() => setSize(s)}
                    label={s.label}
                    sub={`$${s.price.toFixed(2)}`}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Crust */}
          {Array.isArray(item.crustOptions) && item.crustOptions.length > 0 && (
            <Section title="Crust">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.crustOptions.map((o) => (
                  <Chip
                    key={o.name}
                    active={crust?.name === o.name}
                    onClick={() => setCrust(o)}
                    label={o.name}
                    sub={Number(o.price) ? `+$${Number(o.price).toFixed(2)}` : ""}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Cheese */}
          {Array.isArray(item.cheeseOptions) && item.cheeseOptions.length > 0 && (
            <Section title="Cheese">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.cheeseOptions.map((o) => (
                  <Chip
                    key={o.name}
                    active={cheese?.name === o.name}
                    onClick={() => setCheese(o)}
                    label={o.name}
                    sub={Number(o.price) ? `+$${Number(o.price).toFixed(2)}` : ""}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Sauce */}
          {Array.isArray(item.sauces) && item.sauces.length > 0 && (
            <Section title="Sauce">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.sauces.map((o) => (
                  <Chip
                    key={o.name}
                    active={sauce?.name === o.name}
                    onClick={() => setSauce(o)}
                    label={o.name}
                    sub={Number(o.price) ? `+$${Number(o.price).toFixed(2)}` : ""}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Toppings */}
          {toppingList.length > 0 && (
            <Section title={`Extra Toppings ($${toppingUnitPrice.toFixed(2)} each)`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {toppingList.map((t) => (
                  <Chip
                    key={t}
                    active={extraToppings.includes(t)}
                    onClick={() => toggleTopping(t)}
                    label={t}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Footer: qty + total + confirm */}
        <div className="shrink-0 border-t border-brand-sand bg-brand-petal px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="rounded-lg border border-brand-sand bg-white p-2 text-brand-warm hover:border-p-red/30 hover:text-p-red transition-colors"
              >
                <MdRemove />
              </button>
              <span className="w-8 text-center text-lg font-bold text-brand-espresso">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="rounded-lg border border-brand-sand bg-white p-2 text-brand-warm hover:border-p-red/30 hover:text-p-red transition-colors"
              >
                <MdAdd />
              </button>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-brand-warm">Line total</p>
              <p className="text-xl font-extrabold text-brand-gold">
                ${lineTotal.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={sizeList.length > 0 && !size}
            className="w-full rounded-xl bg-p-red py-3 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-30 active:scale-[0.98] shadow-md shadow-red-900/20"
          >
            Add to Order · ${lineTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-warm">
        {title}
      </p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border-2 px-3 py-2 text-left transition ${
        active
          ? "border-p-red bg-p-red/5 text-brand-espresso"
          : "border-brand-sand bg-white text-brand-warm hover:border-brand-espresso/20 hover:text-brand-espresso"
      }`}
    >
      <span className="text-xs font-bold">{label}</span>
      {sub && (
        <span className={`text-[10px] ${active ? "text-p-red" : "text-brand-warm"}`}>
          {sub}
        </span>
      )}
    </button>
  );
}
