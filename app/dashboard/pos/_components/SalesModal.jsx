"use client";

import { MdClose, MdTrendingUp } from "react-icons/md";

export default function SalesModal({ open, onClose, salesData }) {
  if (!open || !salesData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-espresso/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-brand-sand p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdTrendingUp className="text-xl text-brand-basil" />
            <h3 className="text-lg font-bold text-brand-espresso">
              Daily Sales · {salesData.date}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sand text-brand-warm hover:bg-brand-espresso hover:text-white transition-colors"
          >
            <MdClose className="text-lg" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl bg-brand-petal border border-brand-sand p-4 text-center">
            <p className="text-xs text-brand-warm">Total Revenue</p>
            <p className="text-3xl font-extrabold text-brand-gold">
              ${salesData.totalRevenue}
            </p>
            <p className="mt-0.5 text-xs text-brand-warm">
              {salesData.totalOrders} orders
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-brand-sand bg-brand-petal p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-warm">POS</p>
              <p className="text-lg font-bold text-brand-espresso">
                ${salesData.pos?.revenue}
              </p>
              <p className="text-[10px] text-brand-warm">
                {salesData.pos?.count} orders
              </p>
            </div>
            <div className="rounded-xl border border-brand-sand bg-brand-petal p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-warm">Online</p>
              <p className="text-lg font-bold text-brand-espresso">
                ${salesData.online?.revenue}
              </p>
              <p className="text-[10px] text-brand-warm">
                {salesData.online?.count} orders
              </p>
            </div>
            <div className="rounded-xl border border-brand-basil/20 bg-brand-basil/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-basil">Cash</p>
              <p className="text-lg font-bold text-brand-basil">
                ${salesData.cash?.revenue}
              </p>
              <p className="text-[10px] text-brand-basil/70">
                {salesData.cash?.count} orders
              </p>
            </div>
            <div className="rounded-xl border border-p-blue/20 bg-p-blue/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-p-blue">Card</p>
              <p className="text-lg font-bold text-p-blue">
                ${salesData.card?.revenue}
              </p>
              <p className="text-[10px] text-p-blue/70">
                {salesData.card?.count} orders
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
