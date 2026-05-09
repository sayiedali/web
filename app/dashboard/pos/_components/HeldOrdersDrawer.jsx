"use client";

import { MdClose, MdPlayArrow } from "react-icons/md";
import { MdPause } from "react-icons/md";

export default function HeldOrdersDrawer({
  open,
  onClose,
  heldOrders,
  onRecall,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-espresso/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white border border-brand-sand p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdPause className="text-xl text-brand-warm" />
            <h3 className="text-lg font-bold text-brand-espresso">
              Held Orders ({heldOrders.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sand text-brand-warm hover:bg-brand-espresso hover:text-white transition-colors"
          >
            <MdClose className="text-lg" />
          </button>
        </div>
        {heldOrders.length === 0 ? (
          <div className="py-8 text-center">
            <MdPause className="mx-auto mb-2 text-4xl text-brand-sand" />
            <p className="text-sm text-brand-warm">No held orders</p>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {heldOrders.map((held) => (
              <div
                key={held.id}
                className="flex items-center justify-between rounded-xl border border-brand-sand bg-brand-petal p-3"
              >
                <div>
                  <p className="text-sm font-bold text-brand-espresso">
                    {held.customerName || "Walk-in"}
                    {held.tableNumber && ` · Table ${held.tableNumber}`}
                  </p>
                  <p className="text-xs text-brand-warm">
                    {held.items.length} item{held.items.length !== 1 ? "s" : ""} ·{" "}
                    {new Date(held.heldAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => onRecall(held)}
                  className="flex items-center gap-1 rounded-lg bg-p-red px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                >
                  <MdPlayArrow /> Recall
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
