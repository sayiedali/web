"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  MdOutlineKitchen,
  MdCheckCircle,
  MdAccessTime,
  MdDeliveryDining,
  MdStorefront,
  MdTableRestaurant,
  MdPointOfSale,
  MdRefresh,
} from "react-icons/md";
import { socket } from "@/app/_socket/socket";
import apiUrl from "@/app/_host/apiURL";
import {
  buildOrderStatusPayload,
  matchesBranch,
  matchesOrderCondition,
  normalizeOrderStatus,
  ORDER_TRACKING_STATUS,
  parseOrderArray,
} from "@/app/dashboard/_utils/orderTracking";

const ORDER_NOW_ENDPOINTS = [
  "/api/v1/order/allnoworder",
  "/api/v1/order/now",
  "/api/v1/orders/now",
];

const getTimeSince = (dateStr) => {
  if (!dateStr) return "0:00";
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getUrgencyColor = (dateStr) => {
  if (!dateStr) return "text-green-400";
  const mins = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (mins < 5) return "text-green-400";
  if (mins < 10) return "text-amber-400";
  return "text-red-400";
};

const getUrgencyBorder = (dateStr) => {
  if (!dateStr) return "border-green-500/30";
  const mins = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (mins < 5) return "border-green-500/30";
  if (mins < 10) return "border-amber-500/40";
  return "border-red-500/50";
};

const getServiceIcon = (order) => {
  if (order.source === "pos") return <MdPointOfSale className="text-amber-400" />;
  if (order.service === "delivery") return <MdDeliveryDining className="text-blue-400" />;
  return <MdStorefront className="text-green-400" />;
};

const getServiceLabel = (order) => {
  if (order.source === "pos" && order.tableNumber)
    return `Table ${order.tableNumber}`;
  if (order.source === "pos") return "POS";
  if (order.service === "delivery") return "Delivery";
  return "Pickup";
};

export default function KdsPage() {
  const data = useSelector((state) => state.userData.userInfo);
  const branch = data?.branchName || "";
  const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN || "";
  const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN || "";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState("all"); // all | pos | online

  // Timer refresh every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch orders
  const fetchOrders = async () => {
    if (!branch) return;
    for (const endpoint of ORDER_NOW_ENDPOINTS) {
      try {
        const res = await axios.get(`${apiUrl}${endpoint}`, {
          auth: { username: "user", password: getToken },
        });
        const allOrders = parseOrderArray(res.data);
        // Show orders that are not rejected and not completed
        const active = allOrders.filter(
          (o) =>
            matchesBranch(o, branch) &&
            !matchesOrderCondition(o, "reject") &&
            ![
              ORDER_TRACKING_STATUS.DELIVERED,
              ORDER_TRACKING_STATUS.PICKED_UP,
            ].includes(normalizeOrderStatus(o))
        );
        setOrders(active);
        setLoading(false);
        return;
      } catch {
        continue;
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  // Socket: new order comes in
  useEffect(() => {
    const handleNewOrder = (data) => {
      try {
        const order = typeof data === "string" ? JSON.parse(data) : data;
        if (matchesBranch(order, branch) && order?._id) {
          setOrders((prev) => {
            if (prev.some((o) => o._id === order._id)) return prev;
            return [order, ...prev];
          });
        }
      } catch {}
    };
    socket.on("renderOrderNow", handleNewOrder);
    socket.on("orderCreatedNow", handleNewOrder);
    return () => {
      socket.off("renderOrderNow", handleNewOrder);
      socket.off("orderCreatedNow", handleNewOrder);
    };
  }, [branch]);

  // Socket: order rejected/deleted
  useEffect(() => {
    const removeOrder = (id) => {
      setOrders((prev) => prev.filter((o) => o._id !== id));
    };
    socket.on("orderNowReject", removeOrder);
    socket.on("deleteOrderNow", removeOrder);
    return () => {
      socket.off("orderNowReject", removeOrder);
      socket.off("deleteOrderNow", removeOrder);
    };
  }, []);

  // Bump (advance status)
  const bumpOrder = async (order) => {
    const statusFlow =
      order.service === "delivery"
        ? [
            ORDER_TRACKING_STATUS.ORDER_PLACED,
            ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE,
            ORDER_TRACKING_STATUS.PREPARING,
            ORDER_TRACKING_STATUS.OUT_FOR_DELIVERY,
            ORDER_TRACKING_STATUS.DELIVERED,
          ]
        : [
            ORDER_TRACKING_STATUS.ORDER_PLACED,
            ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE,
            ORDER_TRACKING_STATUS.PREPARING,
            ORDER_TRACKING_STATUS.READY_FOR_PICKUP,
            ORDER_TRACKING_STATUS.PICKED_UP,
          ];

    const currentIdx = statusFlow.indexOf(normalizeOrderStatus(order));
    if (currentIdx === -1 || currentIdx >= statusFlow.length - 1) {
      // Already at end — remove from KDS
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      return;
    }

    const nextStatus = statusFlow[currentIdx + 1];
    const isFinal =
      nextStatus === "delivered" || nextStatus === "picked_up";

    try {
      await axios.post(
        `${apiUrl}/api/v1/order/status/update`,
        buildOrderStatusPayload(
          order._id,
          nextStatus,
          isFinal ? "delivered" : "approved",
        ),
        { auth: { username: "user", password: postToken } }
      );

      if (isFinal) {
        setOrders((prev) => prev.filter((o) => o._id !== order._id));
        toast.success(`Order bumped: ${nextStatus.replace(/_/g, " ")}`);
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === order._id ? { ...o, orderStatus: nextStatus } : o
          )
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update order status",
      );
    }
  };

  // Filter orders
  const displayOrders = useMemo(() => {
    if (filter === "pos") return orders.filter((o) => o.source === "pos");
    if (filter === "online") return orders.filter((o) => o.source !== "pos");
    return orders;
  }, [orders, filter]);

  if (!branch) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-xl text-gray-400">Please log in to access KDS</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10px)] flex-col overflow-hidden bg-[#0F172A] text-white">
      <ToastContainer position="top-right" autoClose={2000} theme="dark" />

      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1E293B] px-4 py-2">
        <div className="flex items-center gap-3">
          <MdOutlineKitchen className="text-2xl text-green-400" />
          <h1 className="text-lg font-bold">Kitchen Display</h1>
          <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-gray-300">
            {branch}
          </span>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
            {displayOrders.length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          {["all", "pos", "online"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                filter === f
                  ? "bg-green-500 text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={fetchOrders}
            className="ml-2 rounded-lg bg-white/10 p-1.5 text-gray-400 hover:bg-white/20 hover:text-white"
          >
            <MdRefresh className="text-lg" />
          </button>
        </div>
      </div>

      {/* Order Cards Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-500">
            <MdOutlineKitchen className="mb-3 text-6xl" />
            <p className="text-lg font-bold">No active orders</p>
            <p className="text-sm">New orders will appear here in real time</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {displayOrders.map((order) => {
              const orderId = String(order._id).slice(-6).toUpperCase();
              return (
                <div
                  key={order._id}
                  className={`flex flex-col rounded-2xl border-2 ${getUrgencyBorder(
                    order.createdAt
                  )} bg-[#1E293B] overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {getServiceIcon(order)}
                      <span className="text-sm font-extrabold">#{orderId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold capitalize text-gray-300">
                        {getServiceLabel(order)}
                      </span>
                      <div className={`flex items-center gap-0.5 ${getUrgencyColor(order.createdAt)}`}>
                        <MdAccessTime className="text-sm" />
                        <span className="text-xs font-bold tabular-nums">
                          {getTimeSince(order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="border-b border-white/5 px-3 py-1.5">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold capitalize text-gray-300">
                      {(order.orderStatus || "placed").replace(/_/g, " ")}
                    </span>
                    {order.userName && order.userName !== "Walk-in Customer" && (
                      <span className="ml-2 text-[11px] text-gray-400">
                        {order.userName}
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
                    {(order.orderDetails || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="shrink-0 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-400">
                          {item.quantity || 1}x
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold leading-tight text-white">
                            {item.name}
                          </p>
                          {item.size && (
                            <p className="text-[10px] text-gray-400">{item.size}</p>
                          )}
                          {item.infoPizza?.crustOption && (
                            <p className="text-[10px] text-gray-400">
                              {item.infoPizza.crustOption}
                              {item.infoPizza.cheeseOption &&
                                ` \u00B7 ${item.infoPizza.cheeseOption}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {order.orderNote && (
                      <p className="mt-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-300">
                        Note: {order.orderNote}
                      </p>
                    )}
                  </div>

                  {/* Bump Button */}
                  <button
                    onClick={() => bumpOrder(order)}
                    className="flex shrink-0 items-center justify-center gap-2 bg-green-500 py-3 text-sm font-extrabold text-black transition hover:bg-green-400 active:scale-[0.98]"
                  >
                    <MdCheckCircle className="text-lg" /> BUMP
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
