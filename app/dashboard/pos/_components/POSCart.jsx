"use client";

import {
  MdAdd,
  MdRemove,
  MdDelete,
  MdPause,
  MdCheckCircle,
  MdTableRestaurant,
  MdLocalOffer,
  MdPhone,
  MdSearch,
  MdLocationOn,
  MdDirectionsWalk,
  MdLocalShipping,
  MdStorefront,
  MdHeadsetMic,
} from "react-icons/md";
import { IoCart } from "react-icons/io5";

const SERVICE_TYPES = [
  { key: "pickup",   label: "Pickup",   Icon: MdStorefront },
  { key: "delivery", label: "Delivery", Icon: MdLocalShipping },
  { key: "walkin",   label: "Walk-in",  Icon: MdDirectionsWalk },
  { key: "phone",    label: "Phone",    Icon: MdHeadsetMic },
];

export default function POSCart({
  orderItems,
  serviceType,
  onServiceTypeChange,
  tableNumber,
  onTableNumberChange,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  orderNote,
  onOrderNoteChange,
  deliveryAddress,
  onDeliveryAddressChange,
  updateQty,
  removeItem,
  clearOrder,
  holdOrder,
  onPay,
  subtotal,
  discountAmount,
  tax,
  grandTotal,
  deliveryPricing,
  discountType,
  discountValue,
  onDiscountTypeChange,
  onDiscountValueChange,
  onPhoneLookup,
  phoneLookupBusy = false,
}) {
  const totalItems = orderItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="flex w-[340px] shrink-0 flex-col border-l border-brand-sand bg-white lg:w-[380px]">
      {/* Header */}
      <div className="shrink-0 border-b border-brand-sand px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IoCart className="text-xl text-p-red" />
            <h2 className="text-sm font-bold text-brand-espresso">Current Order</h2>
            {totalItems > 0 && (
              <span className="rounded-full bg-p-red/10 px-2 py-0.5 text-[10px] font-bold text-p-red">
                {totalItems} items
              </span>
            )}
          </div>
          {orderItems.length > 0 && (
            <button
              onClick={clearOrder}
              className="text-xs font-semibold text-p-red hover:text-red-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Service Type — 2×2 grid */}
        <div className="mt-2.5 grid grid-cols-4 gap-1">
          {SERVICE_TYPES.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => onServiceTypeChange(key)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-bold transition ${
                serviceType === key
                  ? "bg-p-red text-white shadow-sm"
                  : "bg-brand-petal text-brand-warm hover:bg-brand-sand border border-brand-sand"
              }`}
            >
              <Icon className="text-sm" />
              {label}
            </button>
          ))}
        </div>

        {/* Table # (pickup) + Customer Name */}
        <div className="mt-2 flex gap-2">
          {serviceType === "pickup" && (
            <div className="relative w-[90px] shrink-0">
              <MdTableRestaurant className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-warm text-sm" />
              <input
                type="number"
                placeholder="Table"
                value={tableNumber}
                onChange={(e) => onTableNumberChange(e.target.value)}
                className="w-full rounded-lg border border-brand-sand bg-brand-petal py-1.5 pl-7 pr-2 text-xs text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/20"
              />
            </div>
          )}
          <input
            type="text"
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            className="flex-1 rounded-lg border border-brand-sand bg-brand-petal px-3 py-1.5 text-xs text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/20"
          />
        </div>

        {/* Phone */}
        <div className="relative mt-2">
          <MdPhone className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-warm text-sm" />
          <input
            type="tel"
            placeholder="Customer phone (optional)"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            onBlur={() => {
              if (
                onPhoneLookup &&
                (customerPhone || "").replace(/\D/g, "").length >= 7
              ) {
                onPhoneLookup(customerPhone);
              }
            }}
            className="w-full rounded-lg border border-brand-sand bg-brand-petal py-1.5 pl-7 pr-9 text-xs text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/20"
          />
          {onPhoneLookup && (
            <button
              type="button"
              onClick={() => onPhoneLookup(customerPhone)}
              disabled={
                phoneLookupBusy ||
                (customerPhone || "").replace(/\D/g, "").length < 7
              }
              title="Look up customer by phone"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-brand-warm hover:bg-brand-sand hover:text-p-red disabled:opacity-30"
            >
              {phoneLookupBusy ? (
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-p-red border-t-transparent" />
              ) : (
                <MdSearch />
              )}
            </button>
          )}
        </div>

        {/* Delivery address — shown only for delivery */}
        {serviceType === "delivery" && (
          <div className="relative mt-2">
            <MdLocationOn className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-warm text-sm" />
            <input
              type="text"
              placeholder="Delivery address"
              value={deliveryAddress}
              onChange={(e) => onDeliveryAddressChange(e.target.value)}
              className="w-full rounded-lg border border-brand-sand bg-brand-petal py-1.5 pl-7 pr-3 text-xs text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/20"
            />
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {orderItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-brand-warm">
            <IoCart className="mb-2 text-4xl text-brand-sand" />
            <p className="text-sm font-medium">Tap items to add</p>
            <p className="mt-0.5 text-xs text-brand-warm/70">Your order will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderItems.map((item) => (
              <div
                key={item.lineId}
                className="flex items-center gap-2 rounded-xl border border-brand-sand bg-brand-petal p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-bold text-brand-espresso">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-brand-warm">
                    ${item.price.toFixed(2)}
                    {item.size && ` · ${item.size}`}
                  </p>
                  {item.infoPizza && (
                    <p className="mt-0.5 truncate text-[10px] text-brand-warm/80">
                      {[
                        item.infoPizza.crustOption,
                        item.infoPizza.cheeseOption,
                        item.infoPizza.sauceOption,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {item.infoPizza.extraToppings?.length
                        ? ` + ${item.infoPizza.extraToppings.join(", ")}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => updateQty(item.lineId, -1)}
                    className="rounded-md border border-brand-sand bg-white p-1 text-sm text-brand-warm hover:border-p-red/30 hover:text-p-red"
                  >
                    <MdRemove />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-brand-espresso">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.lineId, 1)}
                    className="rounded-md border border-brand-sand bg-white p-1 text-sm text-brand-warm hover:border-p-red/30 hover:text-p-red"
                  >
                    <MdAdd />
                  </button>
                  <button
                    onClick={() => removeItem(item.lineId)}
                    className="ml-1 rounded-md bg-p-red/10 p-1 text-sm text-p-red hover:bg-p-red/20"
                  >
                    <MdDelete />
                  </button>
                </div>
                <p className="w-16 shrink-0 text-right text-sm font-bold text-brand-gold">
                  ${(item.price * item.qty).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order note */}
      {orderItems.length > 0 && (
        <div className="shrink-0 border-t border-brand-sand px-3 py-2">
          <input
            type="text"
            placeholder="Order note..."
            value={orderNote}
            onChange={(e) => onOrderNoteChange(e.target.value)}
            className="w-full rounded-lg border border-brand-sand bg-brand-petal px-3 py-1.5 text-xs text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/20"
          />
        </div>
      )}

      {/* Discount */}
      {orderItems.length > 0 && (
        <div className="shrink-0 border-t border-brand-sand px-3 py-2">
          <div className="flex items-center gap-2">
            <MdLocalOffer className="shrink-0 text-brand-warm" />
            <select
              value={discountType}
              onChange={(e) => onDiscountTypeChange(e.target.value)}
              className="shrink-0 rounded-lg border border-brand-sand bg-brand-petal px-2 py-1.5 text-[11px] font-bold text-brand-espresso outline-none focus:border-p-red focus:ring-1 focus:ring-p-red/20"
            >
              <option value="none">No discount</option>
              <option value="amount">$ off</option>
              <option value="percent">% off</option>
            </select>
            {discountType !== "none" && (
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={discountType === "percent" ? "10" : "5.00"}
                value={discountValue}
                onChange={(e) => onDiscountValueChange(e.target.value)}
                className="flex-1 rounded-lg border border-brand-sand bg-brand-petal px-2 py-1.5 text-xs text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/20"
              />
            )}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="shrink-0 border-t border-brand-sand px-4 py-3 space-y-1.5 bg-brand-petal">
        <div className="flex justify-between text-xs text-brand-warm">
          <span>Subtotal</span>
          <span className="font-semibold text-brand-espresso">${subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-xs text-brand-basil">
            <span>Discount</span>
            <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-brand-warm">
          <span>Tax (5%)</span>
          <span className="font-semibold text-brand-espresso">${tax.toFixed(2)}</span>
        </div>
        {serviceType === "delivery" && (
          <>
            <div className="flex justify-between text-xs text-brand-warm">
              <span>Delivery Fee</span>
              <span className="font-semibold text-brand-espresso">
                ${Number(deliveryPricing?.deliveryFee || 0).toFixed(2)}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between border-t border-brand-sand pt-2 text-base font-extrabold">
          <span className="text-brand-espresso">TOTAL</span>
          <span className="text-brand-gold">${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="shrink-0 border-t border-brand-sand px-3 py-3 space-y-2 bg-white">
        <div className="flex gap-2">
          <button
            onClick={holdOrder}
            disabled={!orderItems.length}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-sand bg-brand-petal py-2.5 text-xs font-bold text-brand-espresso hover:bg-brand-sand disabled:opacity-30"
          >
            <MdPause className="text-brand-warm" /> Hold
          </button>
          <button
            onClick={onPay}
            disabled={!orderItems.length}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-p-red py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-30 active:scale-[0.98] shadow-md shadow-red-900/20"
          >
            <MdCheckCircle className="text-lg" /> Pay ${grandTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
