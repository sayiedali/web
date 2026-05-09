"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useReactToPrint } from "react-to-print";
import {
  MdPointOfSale,
  MdPause,
  MdReceipt,
  MdPrint,
  MdCancel,
} from "react-icons/md";
import { socket } from "@/app/_socket/socket";
import apiUrl from "@/app/_host/apiURL";

import {
  TAX_RATE,
  getItemPrice,
  getItemSizeLabel,
  DISCOUNT_PIN_PERCENT,
  DISCOUNT_PIN_AMOUNT,
  MANAGER_PIN,
} from "./_components/constants";
import CategoryTabs from "./_components/CategoryTabs";
import MenuGrid from "./_components/MenuGrid";
import POSCart from "./_components/POSCart";
import POSCheckout from "./_components/POSCheckout";
import HeldOrdersDrawer from "./_components/HeldOrdersDrawer";
import SalesModal from "./_components/SalesModal";
import ReceiptTemplate from "./_components/ReceiptTemplate";
import LiveOrdersPanel from "./_components/LiveOrdersPanel";
import POSItemModal from "./_components/POSItemModal";
import {
  deriveDeliveryPricing,
  normalizeDeliveryPricingConfig,
} from "@/app/_utils/deliveryPricing";
import {
  fetchCheckoutDeliveryPricingConfig,
  parseApiErrorMessage,
} from "../_utils/deliveryPricingApi";

export default function PosPage() {
  const data = useSelector((state) => state.userData.userInfo);
  const branch = data?.branchName || "";
  const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN || "";

  // Menu state
  const [menu, setMenu] = useState({});
  const [activeCategory, setActiveCategory] = useState("pizza");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Order state
  const [orderItems, setOrderItems] = useState([]);
  const [serviceType, setServiceType] = useState("pickup");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [phoneLookupBusy, setPhoneLookupBusy] = useState(false);
  const lastLookedUpPhoneRef = useRef("");

  // Held orders (persisted in localStorage per branch — survives refresh)
  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeld, setShowHeld] = useState(false);
  const [heldHydrated, setHeldHydrated] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [tenderedAmount, setTenderedAmount] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");

  // Sales summary
  const [showSales, setShowSales] = useState(false);
  const [salesData, setSalesData] = useState(null);

  // Last completed order for receipt
  const [lastOrder, setLastOrder] = useState(null);
  const receiptRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  // Customization modal
  const [customizingItem, setCustomizingItem] = useState(null);
  const [deliveryPricingConfig, setDeliveryPricingConfig] = useState(() =>
    normalizeDeliveryPricingConfig({})
  );

  // Discount
  const [discountType, setDiscountType] = useState("none"); // none | amount | percent
  const [discountValue, setDiscountValue] = useState("");
  const [discountApproved, setDiscountApproved] = useState(false);
  const discountNeedsPin = useMemo(() => {
    const v = parseFloat(discountValue) || 0;
    if (v <= 0) return false;
    if (discountType === "percent") return v >= DISCOUNT_PIN_PERCENT;
    if (discountType === "amount") return v >= DISCOUNT_PIN_AMOUNT;
    return false;
  }, [discountType, discountValue]);

  // Auto-print receipt once a new order is finalized
  useEffect(() => {
    if (!lastOrder) return;
    const t = setTimeout(() => {
      try { handlePrint(); } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [lastOrder, handlePrint]);

  // Fetch menu
  useEffect(() => {
    if (!branch) return;
    setLoading(true);
    axios
      .get(`${apiUrl}/api/v1/pos/menu/${branch}`)
      .then((res) => {
        setMenu(res.data.menu || {});
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load menu");
        setLoading(false);
      });
  }, [branch]);

  // Fetch backend-driven standard delivery fee config
  useEffect(() => {
    let alive = true;
    if (!branch) return undefined;

    const loadDeliveryPricingConfig = async () => {
      try {
        const config = await fetchCheckoutDeliveryPricingConfig({
          branch,
        });
        if (alive) {
          setDeliveryPricingConfig(normalizeDeliveryPricingConfig(config));
        }
      } catch (error) {
        if (!alive) return;
        setDeliveryPricingConfig(normalizeDeliveryPricingConfig({}));
        toast.error(
          parseApiErrorMessage(
            error,
            "Failed to load delivery fee settings. Using default delivery fee."
          )
        );
      }
    };

    loadDeliveryPricingConfig();
    return () => {
      alive = false;
    };
  }, [branch]);

  // Hydrate held orders from localStorage on branch change
  useEffect(() => {
    if (!branch || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`pos-held-orders:${branch}`);
      setHeldOrders(raw ? JSON.parse(raw) : []);
    } catch {
      setHeldOrders([]);
    }
    setHeldHydrated(true);
  }, [branch]);

  // Persist held orders to localStorage whenever they change (post-hydration)
  useEffect(() => {
    if (!branch || !heldHydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        `pos-held-orders:${branch}`,
        JSON.stringify(heldOrders)
      );
    } catch {}
  }, [heldOrders, branch, heldHydrated]);

  // Computed totals
  const subtotal = useMemo(
    () => orderItems.reduce((sum, i) => sum + i.price * i.qty, 0),
    [orderItems]
  );
  const discountAmount = useMemo(() => {
    const v = parseFloat(discountValue) || 0;
    if (v <= 0) return 0;
    if (discountType === "amount") return Math.min(v, subtotal);
    if (discountType === "percent")
      return Math.min(subtotal, subtotal * (Math.min(v, 100) / 100));
    return 0;
  }, [discountType, discountValue, subtotal]);
  const discountedSubtotal = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );
  const tax = useMemo(() => discountedSubtotal * TAX_RATE, [discountedSubtotal]);
  const deliveryPricing = useMemo(
    () =>
      deriveDeliveryPricing({
        serviceType,
        subtotalBeforeTax: discountedSubtotal,
        config: deliveryPricingConfig,
      }),
    [serviceType, discountedSubtotal, deliveryPricingConfig]
  );
  const grandTotal = useMemo(
    () => discountedSubtotal + tax + deliveryPricing.deliveryFee + (Number(tipAmount) || 0),
    [discountedSubtotal, tax, deliveryPricing.deliveryFee, tipAmount]
  );
  const changeAmount = useMemo(() => {
    const tendered = parseFloat(tenderedAmount) || 0;
    return Math.max(0, tendered - grandTotal);
  }, [tenderedAmount, grandTotal]);

  // Display items: when search is active search ALL categories, else show active category
  const displayItems = useMemo(() => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const allItems = Object.values(menu).flat();
      return allItems.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }
    return menu[activeCategory] || [];
  }, [menu, activeCategory, searchTerm]);

  // An item is customizable if it has multiple sizes OR any configurable options
  const isCustomizable = (item) => {
    const hasSizes =
      (Array.isArray(item.sizeOptions) && item.sizeOptions.length > 1) ||
      (item.prices &&
        typeof item.prices === "object" &&
        Object.keys(item.prices).filter((k) => item.prices[k]).length > 1);
    const hasOptions =
      (Array.isArray(item.crustOptions) && item.crustOptions.length > 0) ||
      (Array.isArray(item.cheeseOptions) && item.cheeseOptions.length > 0) ||
      (Array.isArray(item.sauces) && item.sauces.length > 0) ||
      (Array.isArray(item.toppings) && item.toppings.length > 0);
    return hasSizes || hasOptions;
  };

  // Cart actions
  const addItem = (item) => {
    if (isCustomizable(item)) {
      setCustomizingItem(item);
      return;
    }
    const price = getItemPrice(item);
    const sizeLabel = getItemSizeLabel(item);
    const lineId = `${item._id}-${sizeLabel}`;

    setOrderItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          lineId,
          _id: item._id,
          name: item.name,
          category: item.category || activeCategory,
          size: sizeLabel,
          price,
          qty: 1,
          image: item.image,
        },
      ];
    });
  };

  // Add a customized item line (from POSItemModal)
  const addCustomizedItem = ({
    item,
    size,
    crust,
    cheese,
    sauce,
    extraToppings,
    qty,
    unitPrice,
  }) => {
    const extrasKey = extraToppings.slice().sort().join(",");
    const lineId = `${item._id}-${size?.key || "s"}-${crust?.name || ""}-${
      cheese?.name || ""
    }-${sauce?.name || ""}-${extrasKey}`;

    setOrderItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          lineId,
          _id: item._id,
          name: item.name,
          category: item.category || activeCategory,
          size: size?.label || "",
          price: unitPrice,
          qty,
          image: item.image,
          infoPizza: {
            crustOption: crust?.name || null,
            cheeseOption: cheese?.name || null,
            sauceOption: sauce?.name || null,
            extraToppings,
          },
        },
      ];
    });
    setCustomizingItem(null);
  };

  const updateQty = (lineId, delta) => {
    setOrderItems((prev) =>
      prev
        .map((i) => (i.lineId === lineId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (lineId) => {
    setOrderItems((prev) => prev.filter((i) => i.lineId !== lineId));
  };

  const lookupCustomerByPhone = async (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 7) return;
    if (lastLookedUpPhoneRef.current === digits) return;
    lastLookedUpPhoneRef.current = digits;
    setPhoneLookupBusy(true);
    try {
      const res = await axios.get(`${apiUrl}/api/v1/pos/customer/lookup`, {
        params: { phone: digits, branch },
        auth: { username: "user", password: postToken },
      });
      if (res.data?.found) {
        setCustomerName((cur) => cur || res.data.name || "");
        toast.info(
          `Returning customer: ${res.data.name} (${res.data.orderCount} order${
            res.data.orderCount === 1 ? "" : "s"
          })`,
          { autoClose: 2000 }
        );
      }
    } catch {
      // silent — lookup is best-effort
    } finally {
      setPhoneLookupBusy(false);
    }
  };

  const clearOrder = () => {
    setOrderItems([]);
    setTableNumber("");
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setOrderNote("");
    setTenderedAmount("");
    setDiscountType("none");
    setDiscountValue("");
    setDiscountApproved(false);
    lastLookedUpPhoneRef.current = "";
    setTipAmount(0);
    setSplitCash("");
    setSplitCard("");
  };

  // Reset tip when service changes away from delivery
  useEffect(() => {
    if (serviceType !== "delivery" && tipAmount !== 0) {
      setTipAmount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

  // Place order — map walk-in/phone to "pickup" for backend compatibility
  const placeOrder = async () => {
    if (!orderItems.length) return toast.error("Add items to the order first");

    const orderDetails = orderItems.map((i) => ({
      name: i.name,
      quantity: i.qty,
      totalPrice: i.price.toFixed(2),
      category: i.category,
      size: i.size,
      ...(i.infoPizza ? { infoPizza: i.infoPizza } : {}),
    }));

    // Map UI service types to backend-safe values
    const backendService =
      serviceType === "walkin" || serviceType === "phone"
        ? "pickup"
        : serviceType;

    try {
      const splitCashNum = parseFloat(splitCash) || 0;
      const splitCardNum = parseFloat(splitCard) || 0;

      let paymentLabel = "Online Payment";
      if (paymentMethod === "cash") paymentLabel = "cashOnPay";
      else if (paymentMethod === "split") {
        paymentLabel = `Split: $${splitCashNum.toFixed(2)} cash + $${splitCardNum.toFixed(2)} card`;
      }

      // Build note with service type context if relevant
      let fullNote = orderNote || "";
      if (serviceType === "walkin") fullNote = ["Walk-in order", fullNote].filter(Boolean).join(" — ");
      if (serviceType === "phone") fullNote = ["Phone order", fullNote].filter(Boolean).join(" — ");

      const res = await axios.post(
        `${apiUrl}/api/v1/pos/order`,
        {
          service: backendService,
          branch,
          tableNumber: tableNumber ? Number(tableNumber) : null,
          orderDetails,
          orderPrice: grandTotal.toFixed(2),
          orderPriceTax: grandTotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          tipAmount: (Number(tipAmount) || 0).toFixed(2),
          deliveryFee: (Number(deliveryPricing.deliveryFee) || 0).toFixed(2),
          normalDeliveryFee: (
            Number(deliveryPricing.normalDeliveryFee) || 0
          ).toFixed(2),
          payment: paymentLabel,
          userName: customerName || "Walk-in Customer",
          phone: customerPhone?.trim() || "0000000000",
          address: deliveryAddress?.trim() || "",
          orderNote: fullNote,
        },
        { auth: { username: "user", password: postToken } }
      );

      if (res.data.success) {
        setLastOrder({
          ...res.data.order,
          _items: orderItems,
          _subtotal: subtotal,
          _discount: discountAmount,
          _tax: tax,
          _deliveryFee: Number(deliveryPricing.deliveryFee) || 0,
          _tip: Number(tipAmount) || 0,
          _grandTotal: grandTotal,
          _tendered: parseFloat(tenderedAmount) || grandTotal,
          _change: changeAmount,
          _paymentMethod: paymentMethod,
          _splitCash: splitCashNum,
          _splitCard: splitCardNum,
        });

        socket.emit("orderCreate", JSON.stringify(res.data.order));

        toast.success(
          `Order #${String(res.data.order._id).slice(-6).toUpperCase()} placed!`
        );
        clearOrder();
        setShowPayment(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to place order");
    }
  };

  // Hold / recall
  const holdOrder = () => {
    if (!orderItems.length) return;
    const held = {
      id: Date.now(),
      items: [...orderItems],
      serviceType,
      tableNumber,
      customerName,
      customerPhone,
      deliveryAddress,
      orderNote,
      heldAt: new Date().toISOString(),
    };
    setHeldOrders((prev) => [held, ...prev]);
    clearOrder();
    toast.info("Order parked");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };
    const onKey = (e) => {
      const typing = isTypingTarget(e.target);

      if (e.key === "Escape") {
        if (customizingItem) { setCustomizingItem(null); e.preventDefault(); return; }
        if (showPayment) { setShowPayment(false); e.preventDefault(); return; }
        if (showHeld) { setShowHeld(false); e.preventDefault(); return; }
        if (showSales) { setShowSales(false); e.preventDefault(); return; }
        if (typing && e.target?.dataset?.posSearch === "true") {
          setSearchTerm(""); e.target.blur(); e.preventDefault();
        }
        return;
      }

      if (typing) return;

      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const el = document.querySelector('[data-pos-search="true"]');
        if (el) { el.focus(); e.preventDefault(); }
        return;
      }

      if (e.key === "F1") { setServiceType("pickup"); e.preventDefault(); return; }
      if (e.key === "F2") { setServiceType("delivery"); e.preventDefault(); return; }

      if (e.key === "F9" && orderItems.length && !showPayment && !customizingItem) {
        if (discountNeedsPin && !discountApproved) {
          const entered = window.prompt(
            `Manager PIN required for this discount\n` +
              `(>= ${DISCOUNT_PIN_PERCENT}% or $${DISCOUNT_PIN_AMOUNT})`
          );
          if (entered == null) return;
          if (entered !== MANAGER_PIN) { toast.error("Incorrect manager PIN"); return; }
          setDiscountApproved(true);
        }
        setShowPayment(true);
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
        if (orderItems.length) { holdOrder(); e.preventDefault(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customizingItem, showPayment, showHeld, showSales,
    orderItems.length, discountNeedsPin, discountApproved,
  ]);

  const recallOrder = (held) => {
    setOrderItems(held.items);
    setServiceType(held.serviceType);
    setTableNumber(held.tableNumber || "");
    setCustomerName(held.customerName || "");
    setCustomerPhone(held.customerPhone || "");
    setDeliveryAddress(held.deliveryAddress || "");
    setOrderNote(held.orderNote || "");
    setHeldOrders((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeld(false);
  };

  const voidLastOrder = async () => {
    if (!lastOrder?._id) return;
    const shortId = String(lastOrder._id).slice(-6).toUpperCase();
    if (!window.confirm(`Void order #${shortId}? This cannot be undone.`)) return;
    try {
      await axios.post(
        `${apiUrl}/api/v1/pos/order/${lastOrder._id}/void`,
        {},
        { auth: { username: "user", password: postToken } }
      );
      socket.emit("orderNowReject", lastOrder._id);
      toast.success(`Order #${shortId} voided`);
      setLastOrder(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to void order");
    }
  };

  const fetchSales = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/v1/pos/sales/${branch}`);
      setSalesData(res.data);
      setShowSales(true);
    } catch {
      toast.error("Failed to load sales data");
    }
  };

  if (!branch) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-brand-cream">
        <p className="text-xl text-brand-warm">Please log in to access POS</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10px)] flex-col overflow-hidden bg-brand-cream text-brand-espresso">
      <ToastContainer position="top-right" autoClose={2000} theme="colored" />

      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-brand-sand bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-p-red">
            <MdPointOfSale className="text-lg text-white" />
          </div>
          <h1 className="text-base font-bold text-brand-espresso">POS Terminal</h1>
          <span className="rounded-full bg-brand-petal px-3 py-0.5 text-xs font-semibold text-brand-warm border border-brand-sand">
            {branch}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LiveOrdersPanel branch={branch} />
          <button
            onClick={() => setShowHeld(true)}
            className="flex items-center gap-1 rounded-lg border border-brand-sand bg-brand-petal px-3 py-1.5 text-xs font-bold text-brand-espresso hover:bg-brand-sand"
          >
            <MdPause className="text-brand-warm" /> Held ({heldOrders.length})
          </button>
          <button
            onClick={fetchSales}
            className="flex items-center gap-1 rounded-lg border border-brand-sand bg-brand-petal px-3 py-1.5 text-xs font-bold text-brand-espresso hover:bg-brand-sand"
          >
            <MdReceipt className="text-brand-basil" /> Sales
          </button>
        </div>
      </div>

      {/* Main 70/30 Layout */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT: category tabs + menu */}
        <div className="flex flex-1 min-w-0 flex-col">
          <CategoryTabs
            activeCategory={activeCategory}
            onSelect={(key) => {
              setActiveCategory(key);
              setSearchTerm("");
            }}
          />
          <MenuGrid
            items={displayItems}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onAdd={addItem}
          />
        </div>

        {/* RIGHT: cart */}
        <POSCart
          orderItems={orderItems}
          serviceType={serviceType}
          onServiceTypeChange={setServiceType}
          tableNumber={tableNumber}
          onTableNumberChange={setTableNumber}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          customerPhone={customerPhone}
          onCustomerPhoneChange={setCustomerPhone}
          onPhoneLookup={lookupCustomerByPhone}
          phoneLookupBusy={phoneLookupBusy}
          deliveryAddress={deliveryAddress}
          onDeliveryAddressChange={setDeliveryAddress}
          orderNote={orderNote}
          onOrderNoteChange={setOrderNote}
          updateQty={updateQty}
          removeItem={removeItem}
          clearOrder={clearOrder}
          holdOrder={holdOrder}
          onPay={() => {
            if (discountNeedsPin && !discountApproved) {
              const entered = window.prompt(
                `Manager PIN required for this discount\n` +
                  `(>= ${DISCOUNT_PIN_PERCENT}% or $${DISCOUNT_PIN_AMOUNT})`
              );
              if (entered == null) return;
              if (entered !== MANAGER_PIN) {
                toast.error("Incorrect manager PIN");
                return;
              }
              setDiscountApproved(true);
            }
            setShowPayment(true);
          }}
          subtotal={subtotal}
          discountAmount={discountAmount}
          tax={tax}
          grandTotal={grandTotal}
          deliveryPricing={deliveryPricing}
          discountType={discountType}
          discountValue={discountValue}
          onDiscountTypeChange={(t) => {
            setDiscountType(t);
            setDiscountApproved(false);
          }}
          onDiscountValueChange={(v) => {
            setDiscountValue(v);
            setDiscountApproved(false);
          }}
        />
      </div>

      {/* Modals */}
      <POSCheckout
        open={showPayment}
        onClose={() => setShowPayment(false)}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        tenderedAmount={tenderedAmount}
        onTenderedAmountChange={setTenderedAmount}
        grandTotal={grandTotal}
        changeAmount={changeAmount}
        onConfirm={placeOrder}
        showTip={serviceType === "delivery"}
        tipAmount={tipAmount}
        onTipAmountChange={setTipAmount}
        subtotalForTip={discountedSubtotal}
        splitCash={splitCash}
        splitCard={splitCard}
        onSplitCashChange={setSplitCash}
        onSplitCardChange={setSplitCard}
      />

      <HeldOrdersDrawer
        open={showHeld}
        onClose={() => setShowHeld(false)}
        heldOrders={heldOrders}
        onRecall={recallOrder}
      />

      <SalesModal
        open={showSales}
        onClose={() => setShowSales(false)}
        salesData={salesData}
      />

      <POSItemModal
        open={!!customizingItem}
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
        onConfirm={addCustomizedItem}
      />

      {/* Hidden receipt for printing */}
      {lastOrder && (
        <div className="fixed left-[-9999px]">
          <ReceiptTemplate ref={receiptRef} order={lastOrder} branch={branch} />
        </div>
      )}

      {/* Last-order action bar */}
      {lastOrder && !showPayment && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
          <button
            onClick={voidLastOrder}
            className="flex items-center gap-2 rounded-xl bg-p-red px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-red-700 active:scale-[0.98]"
          >
            <MdCancel /> Void Last
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-brand-sand bg-white px-4 py-2 text-sm font-bold text-brand-espresso shadow-lg hover:bg-brand-petal"
          >
            <MdPrint /> Print Last Receipt
          </button>
        </div>
      )}
    </div>
  );
}
