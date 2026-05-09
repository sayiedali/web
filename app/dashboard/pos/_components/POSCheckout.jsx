"use client";

import { useMemo } from "react";
import { MdClose, MdCheckCircle } from "react-icons/md";

export default function POSCheckout({
  open,
  onClose,
  paymentMethod,
  onPaymentMethodChange,
  tenderedAmount,
  onTenderedAmountChange,
  grandTotal,
  changeAmount,
  onConfirm,
  showTip = false,
  tipAmount = 0,
  onTipAmountChange,
  subtotalForTip = 0,
  splitCash = "",
  splitCard = "",
  onSplitCashChange,
  onSplitCardChange,
}) {
  const quickCashAmounts = useMemo(() => {
    const gt = grandTotal;
    const rounded = Math.ceil(gt);
    const amounts = [rounded];
    if (rounded + 5 > gt) amounts.push(rounded + 5);
    if (rounded + 10 > gt) amounts.push(rounded + 10);
    amounts.push(Math.ceil(gt / 20) * 20);
    amounts.push(50, 100);
    return [...new Set(amounts)].sort((a, b) => a - b).slice(0, 5);
  }, [grandTotal]);

  const tipPresets = useMemo(() => {
    if (subtotalForTip <= 0) return [];
    return [10, 15, 20].map((pct) => ({
      pct,
      amount: +(subtotalForTip * (pct / 100)).toFixed(2),
    }));
  }, [subtotalForTip]);

  const splitCashNum = parseFloat(splitCash) || 0;
  const splitCardNum = parseFloat(splitCard) || 0;
  const splitCovered = splitCashNum + splitCardNum;
  const splitRemaining = Math.max(0, grandTotal - splitCovered);
  const splitChange = Math.max(0, splitCovered - grandTotal);

  if (!open) return null;

  const canConfirm = (() => {
    if (paymentMethod === "cash")
      return (parseFloat(tenderedAmount) || 0) >= grandTotal;
    if (paymentMethod === "split") return splitCovered >= grandTotal;
    return true;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-espresso/40 backdrop-blur-sm p-4">
      <div className="max-h-[95vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white border border-brand-sand p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-espresso">Payment</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sand text-brand-warm hover:bg-brand-espresso hover:text-white transition-colors"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Method selector */}
        <div className="mb-4 flex gap-2">
          {[
            { key: "cash", label: "💵 Cash" },
            { key: "card", label: "💳 Card" },
            { key: "split", label: "✂️ Split" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onPaymentMethodChange(key)}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${
                paymentMethod === key
                  ? "bg-p-red text-white shadow-md shadow-red-900/20"
                  : "border border-brand-sand bg-brand-petal text-brand-espresso hover:bg-brand-sand"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grand total display */}
        <div className="mb-4 rounded-xl bg-brand-petal border border-brand-sand p-4 text-center">
          <p className="text-xs font-medium text-brand-warm">Grand Total</p>
          <p className="text-3xl font-extrabold text-brand-gold">
            ${grandTotal.toFixed(2)}
          </p>
        </div>

        {/* Tip (delivery only) */}
        {showTip && (
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-brand-warm">
              Driver Tip
            </label>
            <div className="flex gap-1.5">
              {tipPresets.map((t) => (
                <button
                  key={t.pct}
                  onClick={() => onTipAmountChange(t.amount)}
                  className={`flex-1 rounded-lg py-2 text-[11px] font-bold transition ${
                    Math.abs(tipAmount - t.amount) < 0.01
                      ? "bg-brand-basil text-white"
                      : "border border-brand-sand bg-brand-petal text-brand-warm hover:bg-brand-sand"
                  }`}
                >
                  {t.pct}%
                  <span className="block text-[9px] font-normal opacity-80">
                    ${t.amount.toFixed(2)}
                  </span>
                </button>
              ))}
              <button
                onClick={() => onTipAmountChange(0)}
                className={`flex-1 rounded-lg py-2 text-[11px] font-bold transition ${
                  tipAmount === 0
                    ? "bg-brand-sand text-brand-espresso"
                    : "border border-brand-sand bg-brand-petal text-brand-warm hover:bg-brand-sand"
                }`}
              >
                None
              </button>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Custom"
                value={
                  tipAmount > 0 &&
                  !tipPresets.some((p) => Math.abs(p.amount - tipAmount) < 0.01)
                    ? tipAmount
                    : ""
                }
                onChange={(e) =>
                  onTipAmountChange(parseFloat(e.target.value) || 0)
                }
                className="w-20 rounded-lg border border-brand-sand bg-brand-petal px-2 py-2 text-[11px] text-brand-espresso outline-none placeholder:text-brand-warm focus:border-p-red focus:ring-1 focus:ring-p-red/20"
              />
            </div>
          </div>
        )}

        {/* Cash */}
        {paymentMethod === "cash" && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-warm">
                Amount Tendered
              </label>
              <input
                type="number"
                step="0.01"
                value={tenderedAmount}
                onChange={(e) => onTenderedAmountChange(e.target.value)}
                className="w-full rounded-xl border border-brand-sand bg-brand-petal px-4 py-3 text-xl font-bold text-brand-espresso outline-none focus:border-p-red focus:ring-2 focus:ring-p-red/20"
                placeholder="$0.00"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {quickCashAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => onTenderedAmountChange(String(amt))}
                  className="rounded-lg border border-brand-sand bg-brand-petal px-3 py-1.5 text-xs font-bold text-brand-espresso hover:bg-brand-sand"
                >
                  ${amt}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-brand-basil/10 border border-brand-basil/20 p-3 text-center">
              <p className="text-xs font-medium text-brand-basil">Change Due</p>
              <p className="text-2xl font-extrabold text-brand-basil">
                ${changeAmount.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        {paymentMethod === "card" && (
          <div className="mb-4 rounded-xl border border-brand-sand bg-brand-petal p-4 text-center">
            <p className="text-sm text-brand-warm">
              Process card payment on terminal, then confirm below.
            </p>
          </div>
        )}

        {/* Split */}
        {paymentMethod === "split" && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-warm">
                  Cash
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$0.00"
                  value={splitCash}
                  onChange={(e) => onSplitCashChange(e.target.value)}
                  className="w-full rounded-xl border border-brand-sand bg-brand-petal px-3 py-2.5 text-base font-bold text-brand-espresso outline-none focus:border-brand-basil focus:ring-2 focus:ring-brand-basil/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-warm">
                  Card
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$0.00"
                  value={splitCard}
                  onChange={(e) => onSplitCardChange(e.target.value)}
                  className="w-full rounded-xl border border-brand-sand bg-brand-petal px-3 py-2.5 text-base font-bold text-brand-espresso outline-none focus:border-p-blue focus:ring-2 focus:ring-p-blue/20"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const cash = parseFloat(splitCash) || 0;
                onSplitCardChange((grandTotal - cash).toFixed(2));
              }}
              className="w-full rounded-lg border border-brand-sand bg-brand-petal py-1.5 text-[11px] font-bold text-brand-warm hover:bg-brand-sand"
            >
              Fill remainder on card
            </button>
            {splitRemaining > 0 ? (
              <div className="rounded-xl border border-brand-gold/20 bg-brand-gold/10 p-3 text-center">
                <p className="text-xs font-medium text-brand-gold">Remaining</p>
                <p className="text-2xl font-extrabold text-brand-gold">
                  ${splitRemaining.toFixed(2)}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-brand-basil/20 bg-brand-basil/10 p-3 text-center">
                <p className="text-xs font-medium text-brand-basil">
                  {splitChange > 0 ? "Cash Change" : "Fully Covered"}
                </p>
                <p className="text-2xl font-extrabold text-brand-basil">
                  ${splitChange.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-p-red py-3.5 text-base font-extrabold text-white hover:bg-red-700 disabled:opacity-30 active:scale-[0.98] shadow-md shadow-red-900/20"
        >
          <MdCheckCircle className="text-xl" /> Complete Order
        </button>
      </div>
    </div>
  );
}
