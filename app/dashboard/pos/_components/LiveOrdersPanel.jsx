"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  MdNotifications,
  MdClose,
  MdDeliveryDining,
  MdStorefront,
  MdAccessTime,
} from "react-icons/md";
import { socket } from "@/app/_socket/socket";
import apiUrl from "@/app/_host/apiURL";

const getTimeSince = (dateStr) => {
  if (!dateStr) return "now";
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
};

export default function LiveOrdersPanel({ branch }) {
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!branch) return;
    axios
      .get(`${apiUrl}/api/v1/order/allnoworder`)
      .then((res) => {
        const all = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.orders || [];
        const online = all.filter(
          (o) =>
            o.branch === branch &&
            o.source !== "pos" &&
            o.orderCondition !== "reject" &&
            o.orderCondition !== "delivered"
        );
        setOrders(online.slice(0, 20));
      })
      .catch(() => {});
  }, [branch]);

  useEffect(() => {
    const handleNew = (data) => {
      try {
        const order = typeof data === "string" ? JSON.parse(data) : data;
        if (!order || order.branch !== branch) return;
        if (order.source === "pos") return;
        setOrders((prev) => {
          if (prev.some((o) => o._id === order._id)) return prev;
          return [order, ...prev].slice(0, 20);
        });
        if (!open) setUnread((n) => n + 1);
      } catch {}
    };
    const handleRemove = (id) =>
      setOrders((prev) => prev.filter((o) => o._id !== id));

    socket.on("renderOrderNow", handleNew);
    socket.on("orderNowReject", handleRemove);
    socket.on("deleteOrderNow", handleRemove);
    return () => {
      socket.off("renderOrderNow", handleNew);
      socket.off("orderNowReject", handleRemove);
      socket.off("deleteOrderNow", handleRemove);
    };
  }, [branch, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1 rounded-lg border border-brand-sand bg-brand-petal px-3 py-1.5 text-xs font-bold text-brand-espresso hover:bg-brand-sand"
      >
        <MdNotifications className="text-p-blue" /> Live ({orders.length})
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-p-red px-1 text-[9px] font-extrabold text-white">
            {unread}
          </span>
        )}
      </button>

      {/* Slide-out Panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-brand-espresso/20"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-[360px] flex-col bg-white border-l border-brand-sand shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-sand px-4 py-3 bg-brand-petal">
              <div className="flex items-center gap-2">
                <MdNotifications className="text-xl text-p-blue" />
                <h3 className="text-sm font-bold text-brand-espresso">Live Online Orders</h3>
                <span className="rounded-full bg-p-blue/10 px-2 py-0.5 text-[10px] font-bold text-p-blue">
                  {orders.length}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-sand text-brand-warm hover:bg-brand-espresso hover:text-white transition-colors"
              >
                <MdClose className="text-sm" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-brand-cream">
              {orders.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-brand-warm">
                  <MdNotifications className="mb-2 text-4xl text-brand-sand" />
                  <p className="text-sm font-medium">No active online orders</p>
                </div>
              ) : (
                orders.map((order) => {
                  const id = String(order._id).slice(-6).toUpperCase();
                  const isDelivery = order.service === "delivery";
                  return (
                    <div
                      key={order._id}
                      className="rounded-xl border border-brand-sand bg-white p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isDelivery ? (
                            <MdDeliveryDining className="text-p-blue" />
                          ) : (
                            <MdStorefront className="text-brand-basil" />
                          )}
                          <span className="text-sm font-extrabold text-brand-espresso">
                            #{id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-brand-warm">
                          <MdAccessTime />
                          <span>{getTimeSince(order.createdAt)}</span>
                        </div>
                      </div>
                      <p className="truncate text-xs text-brand-warm">
                        {order.userName || "Customer"}
                        {order.phone && ` · ${order.phone}`}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="rounded-full bg-brand-petal border border-brand-sand px-2 py-0.5 text-[10px] font-bold capitalize text-brand-warm">
                          {(order.orderStatus || "placed").replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-bold text-brand-gold">
                          ${order.orderPriceTax || order.orderPrice}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
