"use client";
import { socket } from "@/app/_socket/socket";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FaCheck, FaTimesCircle } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import { LiaSearchSolid } from "react-icons/lia";
import { MdCircle } from "react-icons/md";
import { PiCircleHalfFill } from "react-icons/pi";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";
import "react-toastify/dist/ReactToastify.css";
import apiUrl from "@/app/_host/apiURL";
import {
  buildOrderStatusPayload,
  matchesBranch,
  matchesOrderCondition,
  matchesOrderType,
  ORDER_TRACKING_STATUS,
  getStatusHistory,
  getStatusLabel,
  getTypeLabel,
  normalizeOrderStatus,
  parseOrderArray,
} from "@/app/dashboard/_utils/orderTracking";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const ORDER_NOW_ENDPOINTS = [
  "/api/v1/order/now",
  "/api/v1/orders/now",
  "/api/v1/order/allnoworder",
];

const parseApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const page = () => {
  let data = useSelector((state) => state);
  const [invoiceData, setInvoiceData] = useState();
  let [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );

  // update code
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const stopTimerRef = useRef(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }
    return audioCtxRef.current;
  };

  const stopBeep = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {}
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const playBeep = () => {
    try {
      const ctx = getAudioContext();

      if (ctx.state === "suspended") {
        ctx.resume().then(() => playBeep());
        return;
      }

      stopBeep();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);

      const beepOn = 0.3;
      const beepOff = 0.3;
      const totalTime = 20;

      for (let t = 0; t < totalTime; t += beepOn + beepOff) {
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime + t);
        gainNode.gain.setValueAtTime(0.0, ctx.currentTime + t + beepOn);
      }

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + totalTime);
      oscillatorRef.current = oscillator;

      stopTimerRef.current = setTimeout(() => {
        oscillatorRef.current = null;
        stopTimerRef.current = null;
      }, totalTime * 1000);
    } catch (err) {
      console.warn("Sound", err);
    }
  };
  // update code

  // invoice printing functionality start
  const contentToPrint = useRef(null);
  const handlePrint = useReactToPrint({
    documentTitle: "Print This Document",
    onBeforePrint: () => console.log("before printing..."),
    onAfterPrint: () => console.log("after printing..."),
    removeAfterPrint: true,
  });

  // delivery man get according to branch start
  let dataUser = useSelector((data) => data.userData.userInfo?.branchName);
  // delivery man get according to branch end

  const [dataArr, setDataArr] = useState([]);
  const [clickedIndex, setClickedIndex] = useState(null);
  const [closeAcceptBtn, setCloseAcceptBtn] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState([]);
  const [selectedDeliveryMan, setSelectedDeliveryMan] = useState({});
  const [acceptOrderId, setAcceptOrderId] = useState("");
  const [orderDetailObj, setOrderDetailObj] = useState();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [trackingSyncState, setTrackingSyncState] = useState({});

  const handleButtonClick = (index) => {
    setClickedIndex(index);
    setCloseAcceptBtn(true);
  };

  useEffect(() => {
    const loadNowOrders = async () => {
      if (!branch) return;
      const endpoints = [
        `/api/v1/dashboard/now-pending-order/${branch}`,
        ...ORDER_NOW_ENDPOINTS,
      ];
      let lastError;
      for (const endpoint of endpoints) {
        try {
          const res = await axios.get(`${apiUrl}${endpoint}`, {
            auth: { username: "user", password: getToken },
          });
          setPendingOrderData(parseOrderArray(res.data));
          return;
        } catch (error) {
          lastError = error;
          if (error?.response?.status !== 404) break;
        }
      }

      setPendingOrderData([]);
      toast.error(parseApiError(lastError, "Unable to load live orders."));
    };

    loadNowOrders();
    const refreshTimer = setInterval(loadNowOrders, 30000);
    return () => clearInterval(refreshTimer);
  }, [branch]);

  //  get delivery man to assign
  let [deliveryManDetail, setDeliveryManDetail] = useState([]);
  useEffect(() => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/delivery/getAllDeliveryMan/${dataUser}`,
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          setDeliveryManDetail(response.data.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, [dataUser]);

  // assign delivery man function
  let handleSelectDeliveryMan = (deliveryManObj, orderId) => {
    setSelectedDeliveryMan(deliveryManObj);
    setAcceptOrderId(orderId);
  };

  // Date format function
  const formatDateTime = (createdAt) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(createdAt).toLocaleDateString(undefined, options);
  };

  useEffect(() => {
    socket.on("connected", (data) => {
      console.log(data);
    });

    const handleIncomingNowOrder = (data) => {
      let orderAllObjInfo = data;
      if (typeof data === "string") {
        try {
          orderAllObjInfo = JSON.parse(data);
        } catch {
          return;
        }
      }
      playBeep();
      setPendingOrderData((prev) => [...prev, orderAllObjInfo]);
    };

    socket.on("renderOrderNow", handleIncomingNowOrder);
    socket.on("orderCreatedNow", handleIncomingNowOrder);

    socket.on("deleteOrderNow", (id) => {
      setPendingOrderData((prev) => {
        return prev.filter((el) => el._id != id);
      });
    });

    socket.on("updateInfoOrderNow", (id) => {
      setPendingOrderData((prev) => {
        return prev.filter((el) => el._id != id);
      });
    });

    socket.on("orderNowReject", (id) => {
      setPendingOrderData((prev) => {
        return prev.filter((el) => el._id != id);
      });
    });

    return () => {
      socket.off("connected");
      socket.off("renderOrderNow", handleIncomingNowOrder);
      socket.off("orderCreatedNow", handleIncomingNowOrder);
      socket.off("deleteOrderNow");
      socket.off("updateInfoOrderNow");
      socket.off("orderNowReject");
    };
  }, []);

  const handleAcceptOrder = () => {
    if (acceptOrderId == "") {
      toast.error("Please Select Delivery Man.");
    } else {
      socket.emit("assignDeliveryMan", {
        manId: selectedDeliveryMan._id,
        orderId: acceptOrderId,
      });
    }
  };

  const handleAcceptOrderTwo = async (data) => {
    if (!data?._id) return;

    socket.emit("assignDeliveryMan", {
      manId: data.service === "pickup" ? "pickup" : "delivery",
      orderId: data._id,
    });

    try {
      const response = await axios.post(
        `${apiUrl}/api/v1/order/status/update`,
        buildOrderStatusPayload(
          data._id,
          ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE,
          "approved",
        ),
        { auth: { username: "user", password: postToken } },
      );
      setTrackingSyncState((prev) => ({
        ...prev,
        [data._id]: "synced",
      }));

      const notification = response.data?.notification;
      if (notification && notification.sent) {
        toast.success("Order accepted & customer notified.");
      } else if (notification && !notification.sent) {
        toast.success("Order accepted but customer notification failed.");
      } else {
        toast.success("Order accepted and tracking updated.");
      }
    } catch (error) {
      setTrackingSyncState((prev) => ({
        ...prev,
        [data._id]: "failed",
      }));
      toast.warn(
        parseApiError(error, "Order accepted, but tracking sync failed."),
      );
    }
  };

  const handleRetryTrackingSync = async (order) => {
    if (!order?._id) return;
    setTrackingSyncState((prev) => ({ ...prev, [order._id]: "pending" }));

    try {
      await axios.post(
        `${apiUrl}/api/v1/order/status/update`,
        buildOrderStatusPayload(order._id, normalizeOrderStatus(order)),
        { auth: { username: "user", password: postToken } },
      );
      setTrackingSyncState((prev) => ({ ...prev, [order._id]: "synced" }));
      toast.success("Tracking sync retried successfully.");
    } catch (error) {
      setTrackingSyncState((prev) => ({ ...prev, [order._id]: "failed" }));
      toast.error(
        parseApiError(error, "Retry failed. Tracking sync is still not updated."),
      );
    }
  };

  const handleReject = (id) => {
    socket.emit("rejectOrder", id);
  };

  const handleUnlockAudio = () => {
    const ctx = getAudioContext();
    ctx.resume().then(() => {
      setAudioUnlocked(true);
    });
  };

  const handleStop = () => {
    stopBeep();
  };

  const liveOrders = pendingOrderData.filter(
    (item) =>
      matchesOrderType(item, "now") &&
      matchesOrderCondition(item, "pending") &&
      matchesBranch(item, branch),
  );

  const getStage = (item) => {
    const status = normalizeOrderStatus(item);
    if (status === ORDER_TRACKING_STATUS.ORDER_PLACED) return "new";
    if (
      status === ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE ||
      status === ORDER_TRACKING_STATUS.PREPARING
    )
      return "preparing";
    if (status === ORDER_TRACKING_STATUS.READY_FOR_PICKUP) return "ready";
    if (status === ORDER_TRACKING_STATUS.OUT_FOR_DELIVERY) return "out_for_delivery";
    if (
      status === ORDER_TRACKING_STATUS.DELIVERED ||
      status === ORDER_TRACKING_STATUS.PICKED_UP
    )
      return "completed";
    if (status === ORDER_TRACKING_STATUS.REJECTED) return "rejected";
    return "new";
  };

  const stageTabs = [
    { id: "all", label: "All" },
    { id: "new", label: "New" },
    { id: "preparing", label: "Preparing" },
    { id: "ready", label: "Ready" },
    { id: "out_for_delivery", label: "Out for Delivery" },
    { id: "completed", label: "Completed" },
    { id: "rejected", label: "Rejected" },
  ];

  const filteredLiveOrders = liveOrders.filter((item) => {
    const matchesSearch = !searchQuery || item._id
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || getStage(item) === stageFilter;
    const matchesType = orderTypeFilter === "all" || item.service === orderTypeFilter;
    return matchesSearch && matchesStage && matchesType;
  });

  const getAgeLabel = (createdAt) => {
    const diffMinutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000),
    );
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m ago`;
  };

  const getTrackingSyncBadge = (order) => {
    const localState = trackingSyncState[order._id];
    const state =
      localState || order?.trackingSyncStatus || order?.trackingStatus || "synced";

    if (state === "failed") {
      return {
        label: "Sync Failed",
        className: "bg-red-50 text-red-700",
      };
    }
    if (state === "pending") {
      return {
        label: "Pending Sync",
        className: "bg-amber-50 text-amber-700",
      };
    }
    return {
      label: "Synced",
      className: "bg-green-50 text-green-700",
    };
  };

  return (
    <div className="pt-[80px] p-[10px] w-full bg-slate-50 min-h-screen">
      <div className="pendingOrder-head">
        <h2 className="mt-5 text-3xl font-bold text-center text-slate-800">
          Live Orders
        </h2>
        <p className="text-center text-slate-500 mt-2">
          Active operations queue for immediate orders
        </p>
      </div>

      {!audioUnlocked ? (
        <button
          className="bg-green-500 px-[20px] font-semibold text-white py-[10px] rounded-lg animate-pulse"
          onClick={handleUnlockAudio}
        >
          🔔 Order Alert Open
        </button>
      ) : (
        <span className="font-semibold text-green-600">
          🔔 Order Alert Running
        </span>
      )}

      <button
        className="bg-p-blue px-[20px] font-semibold text-white py-[10px] rounded-lg ml-5 "
        onClick={handleStop}
      >
        Stop Order Tune
      </button>
      <ToastContainer position="top-center" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">New Orders</p>
          <p className="text-2xl font-bold text-slate-800">
            {liveOrders.filter((item) => getStage(item) === "new").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">In Progress</p>
          <p className="text-2xl font-bold text-slate-800">
            {liveOrders.filter((item) => ["preparing", "ready", "out_for_delivery"].includes(getStage(item))).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pickup</p>
          <p className="text-2xl font-bold text-slate-800">
            {liveOrders.filter((item) => item.service === "pickup").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Delivery</p>
          <p className="text-2xl font-bold text-slate-800">
            {liveOrders.filter((item) => item.service !== "pickup").length}
          </p>
        </div>
      </div>

      <div className="w-full mt-[30px] pb-[20px] flex flex-col gap-4 bg-white border border-slate-200 rounded-xl p-4 sticky top-[80px] z-10">
        <div className="flex flex-wrap gap-2">
          {stageTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStageFilter(tab.id)}
              className={`px-3 py-2 rounded-full text-sm font-semibold ${stageFilter === tab.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {tab.label} ({liveOrders.filter((item) => tab.id === "all" || getStage(item) === tab.id).length})
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 items-center border border-slate-300 px-4 py-3 rounded-lg w-full">
              <LiaSearchSolid className="text-[24px] text-slate-500" />
              <input
                className="w-full outline-none bg-transparent"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID"
              />
          </div>
          <select
            className="border border-slate-300 px-3 py-3 rounded-lg bg-white text-slate-700"
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      <div className="w-full pendingOrder-main">
        <div className="flex flex-col-reverse flex-wrap items-center justify-center gap-5 pendingOrder-inner">
          {filteredLiveOrders &&
            filteredLiveOrders.map(
              (item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 shadow-sm bg-white p-[18px] my-[10px] w-full"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-bold text-[20px] text-slate-800">#{item._id}</p>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          {getTypeLabel(item.service)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          {getAgeLabel(item.createdAt)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getTrackingSyncBadge(item).className}`}
                        >
                          Tracking: {getTrackingSyncBadge(item).label}
                        </span>
                      </div>
                      <hr />

                      {/* order details start */}
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="  font-bold text-[25px] text-p-blue">
                          Order Details:
                        </p>
                        <p className="px-3 py-2 font-semibold rounded-md bg-p-blue">
                          <span className="text-white">
                            Type: {getTypeLabel(item.service)}
                          </span>
                        </p>
                        <p className="px-3 py-2 font-semibold rounded-md bg-indigo-600">
                          <span className="text-white">
                            Status: {getStatusLabel(normalizeOrderStatus(item))}
                          </span>
                        </p>
                        <p className="px-3 py-2 font-semibold rounded-md bg-slate-700">
                          <span className="text-white">
                            Tracking Sync: {getTrackingSyncBadge(item).label}
                          </span>
                        </p>
                        <p className="px-3 py-2 font-semibold bg-green-500 rounded-md ">
                          <span className="text-white">
                            {item.orderDetails.length === 1
                              ? item.orderDetails.length + " item"
                              : item.orderDetails.length + " items"}
                          </span>
                        </p>
                        <p className="px-3 py-2 font-semibold bg-orange-600 rounded-md ">
                          <span className="text-white">
                            Total : {item.orderPrice}
                          </span>
                        </p>
                        <p className="px-3 py-2 font-semibold bg-purple-600 rounded-md ">
                          <span className="text-white">
                            Total TAX : {item.orderPriceTax}
                          </span>
                        </p>

                        {item?.tipAmount?.split("$")[1] && (
                          <p className="px-3 py-2 font-semibold bg-orange-600 rounded-md ">
                            <span className="text-white">
                              Tip : {item?.tipAmount}
                            </span>
                          </p>
                        )}

                        <p className="px-3 py-2 font-semibold bg-gray-600 rounded-md ">
                          <span className="text-white">
                            Payment Method : {item.payment}
                          </span>
                        </p>
                        {/* jomaas */}
                        {item.paymentId && item.payment == "Online Payment" && (
                          <p className="px-3 py-2 font-semibold bg-gray-600 rounded-md ">
                            <span className="text-white">
                              Payment ID :{" "}
                              {item.payment === "Online Payment" &&
                                item.paymentId}
                            </span>
                          </p>
                        )}
                      </div>
                      {/* order details end */}
                      <hr />

                      {/* delivery assignment section - only for delivery orders */}
                      {item.service === "delivery" && (
                        <>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-bold text-[25px] text-p-blue">Delivery Assignment:</p>
                            {item.deliveryMan || item.assignmentStatus ? (
                              <>
                                <p className="px-3 py-2 font-semibold rounded-md bg-green-600">
                                  <span className="text-white">
                                    Status: {item.assignmentStatus || "assigned"}
                                  </span>
                                </p>
                                {item.deliveryMan && (
                                  <p className="px-3 py-2 font-semibold rounded-md bg-blue-600">
                                    <span className="text-white">
                                      Driver: {item.deliveryMan.name || "Assigned"}
                                    </span>
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="px-3 py-2 font-semibold rounded-md bg-yellow-600">
                                <span className="text-white">
                                  Unassigned - Assign in Delivery Management
                                </span>
                              </p>
                            )}
                            <a
                              href="/dashboard/delivery-management"
                              className="px-4 py-2 font-semibold rounded-md bg-p-red text-white hover:opacity-90 text-sm"
                            >
                              Manage Delivery →
                            </a>
                          </div>
                          <hr />
                        </>
                      )}

                      {/* reciever details start */}
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="  font-bold text-[25px] text-p-blue">
                          Reciever Details:
                        </p>
                        <p className="px-3 py-2 font-semibold rounded-md bg-p-red">
                          <span className="text-white">
                            Name : {item.userName}
                          </span>
                        </p>
                        <p className="px-3 py-2 font-semibold bg-orange-600 rounded-md ">
                          <span className="text-white">
                            Phone : {item.phone}
                          </span>
                        </p>
                        {item.email && (
                          <p className="px-3 py-2 font-semibold bg-orange-600 rounded-md ">
                            <span className="text-white">
                              Email : {item.email}
                            </span>
                          </p>
                        )}

                        {item.orderLocation !== "no" && (
                          <p className="px-3 py-2 font-semibold bg-black rounded-md ">
                            <span className="text-white">
                              Location : {item.orderLocation}
                            </span>
                          </p>
                        )}
                      </div>
                      {/* reciever details end */}
                      <hr />

                      {item.user && (
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="  font-bold text-[25px] text-p-blue">
                            User Account Details:
                          </p>
                          <p className="px-3 py-2 font-semibold bg-green-700 rounded-md ">
                            <span className="text-white">
                              ID : {item?.user?._id}
                            </span>
                          </p>
                          <p className="px-3 py-2 font-semibold bg-red-700 rounded-md ">
                            <span className="text-white">
                              Name : {item?.user?.userName}
                            </span>
                          </p>
                          <p className="px-3 py-2 font-semibold bg-yellow-700 rounded-md ">
                            <span className="text-white">
                              Email : {item?.user?.email}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                    {/* user account detils start */}
                    <small className="font-semibold text-p-red">
                      {formatDateTime(item.createdAt)}
                    </small>

                    <div className="flex items-center justify-end gap-3 mt-5 btn-main">
                      <div className="relative accept-btn-box">
                        <div className="flex items-center justify-end gap-3 btn-main">
                          {item.service == "pickup" ? (
                            <div className="relative accept-btn-box">
                              <button
                                className="accept-btn  px-[30px] py-[10px]  rounded-lg bg-green-500 text-white cursor-pointer"
                                onClick={() => handleAcceptOrderTwo(item)}
                              >
                                <FaCheck className="font-semibold text-[18px]" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative accept-btn-box">
                              {/* <button
                                className="accept-btn  px-[30px] py-[10px]  rounded-lg bg-green-500 text-white cursor-pointer"
                                key={index}
                                onClick={() =>
                                  handleButtonClick(
                                    index,
                                    setCloseAcceptBtn(!closeAcceptBtn)
                                  )
                                }
                              >
                                <FaCheck className="font-semibold text-[18px]" />mmm
                              </button> */}

                              <button
                                onClick={() => handleAcceptOrderTwo(item)}
                                className="px-[30px] hover:opacity-[0.7] py-[5px] rounded-lg bg-green-500 text-white font-semibold text-[18px] cursor-pointer"
                              >
                                Accept
                              </button>

                              {clickedIndex === index &&
                              closeAcceptBtn == true ? (
                                <div className="inner-button bg-[#f1f1f1] shadow-xl p-[10px] rounded-lg absolute top-[22px] left-[50%] translate-x-[-50%] flex flex-col jutify-center items-center gap-2 mt-[20px]">
                                  <p className="py-1 font-semibold text-center text-p-blue">
                                    Assign Delivery Man
                                  </p>
                                  {deliveryManDetail &&
                                    deliveryManDetail.map((items) => (
                                      <button
                                        onClick={() =>
                                          handleSelectDeliveryMan(
                                            items,
                                            item._id,
                                          )
                                        }
                                        className={`px-[30px] py-[5px] rounded-lg  font-semibold text-[18px] cursor-pointer ${
                                          items.name ===
                                          selectedDeliveryMan.name
                                            ? "bg-black text-white"
                                            : "bg-blue-500 text-white"
                                        }`}
                                      >
                                        {items.name}
                                      </button>
                                    ))}

                                  <button
                                    onClick={handleAcceptOrder}
                                    className="px-[30px] hover:opacity-[0.7] py-[5px] rounded-lg bg-green-500 text-white font-semibold text-[18px] cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                </div>
                              ) : (
                                ""
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => handleReject(item._id)}
                            className="px-[30px] py-[10px] rounded-lg bg-red-500 text-white cursor-pointer"
                          >
                            <FaXmark className="font-semibold text-[18px]" />
                          </button>
                          {getTrackingSyncBadge(item).label === "Sync Failed" && (
                            <button
                              onClick={() => handleRetryTrackingSync(item)}
                              className="px-[20px] py-[10px] rounded-lg bg-amber-500 text-white cursor-pointer font-semibold"
                            >
                              Retry Sync
                            </button>
                          )}
                          <button
                            className="px-[30px] py-[5px] rounded-lg bg-blue-500 text-white font-semibold text-[18px] cursor-pointer"
                            onClick={() => {
                              setOrderDetailObj({
                                orderNote: item.orderNote,
                                orderId: item._id,
                                orderList: item.orderDetails,
                              });
                              setShowOrderDetail(true);
                              setInvoiceData(item);
                            }}
                          >
                            View Items
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
            )}

          {/* order details modal start */}
          {showOrderDetail && (
            <div
              onClick={() => {
                setShowOrderDetail(false);
                setOrderDetailObj();
              }}
              className="z-[9999999] fixed left-0 top-0  flex h-[100vh] w-full justify-center overflow-y-scroll  bg-[#000000cd]"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full p-1  rounded-lg bg-[#f3f3f3] md:w-[350px] lg:w-[450px]"
              >
                <div className="absolute  right-[-10px] bg-white top-[-10px] h-[20px] w-[20px] rounded-full  text-[30px]"></div>
                <FaTimesCircle
                  onClick={() => {
                    setShowOrderDetail(false);
                    setOrderDetailObj();
                  }}
                  className="absolute right-[-15px]  top-[-15px] cursor-pointer text-[30px] text-p-blue"
                />
                <div className="w-full h-full overflow-y-scroll">
                  {/* invoiceData */}

                  {invoiceData != undefined &&
                  invoiceData.hasOwnProperty("orderType") ? (
                    <>
                      <div ref={contentToPrint} className="p-1">
                        <div className="flex flex-col items-center justify-center w-full gap-1">
                          <h2 className="font-semibold text-[14px] text-center uppercase text-p-red">
                            Jomaas pizza & donair - Capilano
                          </h2>
                          <small className="text-center text-p-blue">
                            {invoiceData?.storeAddress}
                          </small>

                          {invoiceData.service == "pickup" ? (
                            <h2 className="text-[12px]  text-center uppercase text-p-blue">
                              Pickup - {invoiceData.orderType}{" "}
                              {invoiceData.orderType !== "now" &&
                                `(${formatDateTime(invoiceData.orderTime)})`}
                            </h2>
                          ) : (
                            <h2 className="text-[12px]  text-center uppercase text-p-blue">
                              Delivery - {invoiceData.orderType}{" "}
                              {invoiceData.orderType !== "now" &&
                                `(${formatDateTime(invoiceData.orderTime)})`}
                            </h2>
                          )}

                          {invoiceData?.orderNote != "" && (
                            <div className="w-full text-[12px] border-t border-b">
                              <h2 className="py-1 text-center uppercase text-p-blue">
                                Order Note
                              </h2>
                              <p className="pb-1 text-center text-p-red">
                                <small className="font-semibold text-[12px]">
                                  {invoiceData?.orderNote}
                                </small>
                              </p>
                            </div>
                          )}

                          <div className="w-full font-semibold text-[12px] ">
                            <h2 className="uppercase text-p-blue">
                              Status:{" "}
                              {getStatusLabel(normalizeOrderStatus(invoiceData))}
                            </h2>
                            <h2 className="uppercase text-p-blue">
                              Last Updated:{" "}
                              {formatDateTime(
                                invoiceData?.updatedAt || invoiceData?.createdAt,
                              )}
                            </h2>
                            <h2 className="uppercase text-p-blue">
                              Reciever: {invoiceData?.userName}
                            </h2>
                            <h2 className="uppercase text-p-blue">
                              Phone : {invoiceData.phone}
                            </h2>
                            {invoiceData?.service === "delivery" && (
                              <h2 className="uppercase text-p-blue">
                                Location: {invoiceData?.orderLocation}
                              </h2>
                            )}
                          </div>

                          <div className="w-full p-2 mt-1 rounded-md bg-white">
                            <h3 className="text-[12px] font-semibold text-p-blue uppercase">
                              Tracking Timeline
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {getStatusHistory(invoiceData).map((statusItem) => (
                                <span
                                  key={statusItem.status}
                                  className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                                    statusItem.current
                                      ? "bg-p-red text-white"
                                      : statusItem.complete
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {statusItem.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* {invoiceData.orderDetails.map((item) => */}
                          {/* all item loop here start */}
                          <div className="w-full">
                            <div className="flex flex-col-reverse justify-end w-full h-full">
                              <div className="flex items-center rounded-lg ">
                                <div className="flex flex-col w-full">
                                  {invoiceData.orderDetails.map((item) =>
                                    "infoPizza" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.pizzaInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>PIZZA</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* pizza size start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Pizza Size
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between w-full">
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoPizza.pizzaSize
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>

                                              <small className="text-[10px] text-p-blue">
                                                $
                                                {parseFloat(
                                                  item.infoPizza.pizzaSizeData,
                                                ).toFixed(2)}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* pizza size end */}
                                        <hr />

                                        {/* existing topping position start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Existing Toppings Position
                                          </h3>
                                          <ul className="flex flex-col ">
                                            {item.infoPizza.existingTopPosition.map(
                                              (el, index) => (
                                                <li
                                                  className="flex items-center gap-2"
                                                  key={index}
                                                >
                                                  <small className=" text-[10px] text-p-red">
                                                    {el.title.toUpperCase()}
                                                  </small>
                                                  {el.position == "middle" ? (
                                                    <MdCircle className="text-[18px] text-[#15803d]" />
                                                  ) : el.position == "right" ? (
                                                    <PiCircleHalfFill className="text-[18px] text-[#15803d]" />
                                                  ) : (
                                                    <PiCircleHalfFill className="rotate-[-180deg] text-[18px] text-[#15803d] " />
                                                  )}
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                        {/* existing topping position end */}
                                        <hr />

                                        {/* crust option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Crust Option
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoPizza.crustOption
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* crust option end */}
                                        <hr />

                                        {/* cheese option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Cheese Option
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between">
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoPizza.cheeseOption
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>
                                              <small className="text-[10px] text-p-blue">
                                                {item.infoPizza.cheeseOption ==
                                                  "extra cheese" && "+$3.00"}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* cheese option end */}
                                        <hr />

                                        {item.infoPizza.gluteen.option && (
                                          <>
                                            {/* cheese option start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="text-[10px] text-p-red">
                                                    {
                                                      item.infoPizza.gluteen
                                                        .title
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* cheese option end */}
                                            <hr />
                                          </>
                                        )}

                                        {/* sauce option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Choose Sauce
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoPizza.sauce
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* sauce option end */}
                                        <hr />
                                        {/* extra topping start */}

                                        {item.infoPizza.extraToppingOption
                                          .length != 0 && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Extra Toppings Option
                                            </h3>
                                            <ul className="flex flex-col ">
                                              {item.infoPizza.extraToppingOption?.map(
                                                (el, index) =>
                                                  el.count != 0 && (
                                                    <li
                                                      className="flex items-center justify-between"
                                                      key={index}
                                                    >
                                                      <div className="flex items-center ">
                                                        <small className=" text-[10px] text-p-red">
                                                          {el.title.toUpperCase()}
                                                        </small>
                                                        {el.position ==
                                                        "middle" ? (
                                                          <MdCircle
                                                            className={`text-[18px] ${
                                                              el.count == 1
                                                                ? "text-[#185316]"
                                                                : el.count == 2
                                                                  ? "text-[#4f46e5]"
                                                                  : ""
                                                            }`}
                                                          />
                                                        ) : el.position ==
                                                          "right" ? (
                                                          <PiCircleHalfFill
                                                            className={`text-[18px] ${
                                                              el.count == 1
                                                                ? "text-[#185316]"
                                                                : el.count == 2
                                                                  ? "text-[#4f46e5]"
                                                                  : ""
                                                            }`}
                                                          />
                                                        ) : el.position ==
                                                          "left" ? (
                                                          <PiCircleHalfFill
                                                            className={`rotate-[-180deg] text-[18px] ${
                                                              el.count == 1
                                                                ? "text-[#185316]"
                                                                : el.count == 2
                                                                  ? "text-[#4f46e5]"
                                                                  : ""
                                                            }`}
                                                          />
                                                        ) : (
                                                          ""
                                                        )}
                                                      </div>
                                                      <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                        {el.count == 2 && "2x"}{" "}
                                                        +$
                                                        {parseFloat(
                                                          el.price,
                                                        ).toFixed(2)}
                                                      </small>
                                                    </li>
                                                  ),
                                              )}
                                            </ul>
                                          </div>
                                        )}

                                        {/* extra topping end */}

                                        <hr />
                                        {/* special instruction start */}
                                        {item.infoPizza.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoPizza
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />
                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoDonair" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.donairInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>DONAIR</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* sauce option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Choose Sauce
                                          </h3>
                                          <ul>
                                            {item.infoDonair.sauces.map(
                                              (sauceName) => (
                                                <li>
                                                  <small className="text-[10px] text-p-red">
                                                    {sauceName}
                                                  </small>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                        {/* sauce option end */}
                                        <hr />

                                        {/* make combo start start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Make Combo
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between w-full">
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoDonair.makeCombo
                                                  .comboName == ""
                                                  ? "Not"
                                                  : item.infoDonair.makeCombo
                                                      .comboName}
                                              </small>

                                              <small className="text-[10px] text-p-blue">
                                                +$
                                                {parseFloat(
                                                  item.infoDonair.makeCombo
                                                    .price,
                                                ).toFixed(2)}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* make combo end end */}

                                        <hr />

                                        {/* drinks start start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoDonair.drinks == ""
                                                  ? "Not"
                                                  : item.infoDonair.drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks end end */}

                                        <hr />
                                        {/* special instruction start */}
                                        {item.infoDonair
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoDonair
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />
                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoWings" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.infoWings.title}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>WINGS</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* tossed option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Tossed Options
                                          </h3>
                                          <ul>
                                            {item.infoWings.tossedOptions.map(
                                              (tossedName) => (
                                                <li>
                                                  <small className="text-[10px] text-p-red">
                                                    {tossedName}
                                                  </small>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                        {/* tossed option end */}

                                        <hr />
                                        {/* special instruction start */}
                                        {item.infoWings.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoWings
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoPoutine" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.poutineInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>POUTINES</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* poutine size start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Poutines Size
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between w-full">
                                              <small className=" text-[10px] text-p-red">
                                                {
                                                  item.infoPoutine.poutineSize
                                                    .size
                                                }
                                              </small>

                                              <small className="text-[10px] text-p-blue">
                                                $
                                                {parseFloat(
                                                  item.infoPoutine.poutineSize
                                                    .price,
                                                ).toFixed(2)}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* poutine size end */}
                                        <hr />

                                        {/* extra cheese & meat option start */}
                                        {item.infoPoutine.cheeseOption.find(
                                          (el) => el.cheeseName != "",
                                        ) && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Cheese & Meat Option
                                              </h3>
                                              <ul>
                                                {item.infoPoutine.cheeseOption.map(
                                                  (extraCheese) =>
                                                    extraCheese.cheeseName !=
                                                      "" && (
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {
                                                            extraCheese.cheeseName
                                                          }
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          +$
                                                          {parseFloat(
                                                            extraCheese.price,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    ),
                                                )}
                                              </ul>
                                            </div>
                                            <hr />
                                          </>
                                        )}
                                        {/* extra cheese & meat option end */}

                                        {item.infoPoutine.extraAddedTopping
                                          .length != 0 && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Added Toppings
                                              </h3>
                                              <ul>
                                                {item.infoPoutine.extraAddedTopping?.map(
                                                  (el) => (
                                                    <li className="flex items-center justify-between">
                                                      <small className="text-[10px] text-p-red">
                                                        {el}
                                                      </small>
                                                      <small className="text-[10px] text-p-blue">
                                                        +$1.00
                                                      </small>
                                                    </li>
                                                  ),
                                                )}
                                              </ul>
                                            </div>
                                            <hr />
                                          </>
                                        )}
                                        {/* special instruction start */}
                                        {item.infoPoutine
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoPoutine
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoChicken" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.infoChicken.title}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>CHICKEN</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* comes with option start */}
                                        {item.infoChicken.combo != "" && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Comes with options
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className=" text-[10px] text-p-red">
                                                  {item.infoChicken.combo}
                                                </small>
                                              </li>
                                            </ul>
                                          </div>
                                        )}
                                        {/* comes with option end */}

                                        <hr />
                                        {/* special instruction start */}
                                        {item.infoChicken
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoChicken
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />
                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoPanza" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.infoPanza.title}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>PANZAROTTI</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* sauce option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Default Toppings
                                          </h3>
                                          <ul>
                                            {item.infoPanza.defaultTopping.map(
                                              (el) => (
                                                <li>
                                                  <small className=" text-[10px] text-p-red">
                                                    {el == "SHRIMP" ||
                                                    el == "CRAB" ||
                                                    el == "CHICKEN" ||
                                                    el == "DONAIR MEAT"
                                                      ? `${el} 2x`
                                                      : el}
                                                  </small>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                        {/* sauce option end */}
                                        <hr />

                                        {item.infoPanza.extraTopping.length !=
                                          0 && (
                                          <>
                                            {/* extra toppings start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Toppings
                                              </h3>
                                              <ul>
                                                {item.infoPanza.extraTopping.map(
                                                  (el) => (
                                                    <li className="flex items-center justify-between">
                                                      <small className=" text-[10px] text-p-red">
                                                        {el.title == "SHRIMP" ||
                                                        el.title == "CRAB" ||
                                                        el.title == "CHICKEN" ||
                                                        el.title ==
                                                          "DONAIR MEAT"
                                                          ? `${el.title} 2x`
                                                          : el.title}
                                                      </small>
                                                      <small className="text-[10px] text-p-blue">
                                                        +$
                                                        {parseFloat(
                                                          el.price,
                                                        ).toFixed(2)}
                                                      </small>
                                                    </li>
                                                  ),
                                                )}
                                              </ul>
                                            </div>
                                            {/* extra toppings end */}
                                            <hr />
                                          </>
                                        )}
                                        {/* special instruction start */}
                                        {item.infoPanza.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoPanza
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoGarlic" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            Garlic Fingers
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>GARLIC FINGERS</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* garlic fingers size start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Garlic Fingers Size
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between">
                                              <small className=" text-[10px] text-p-red">
                                                {
                                                  item.infoGarlic.garlicOption
                                                    .name
                                                }
                                              </small>
                                              <small className="text-[10px] text-p-blue">
                                                +$
                                                {parseFloat(
                                                  item.infoGarlic.garlicOption
                                                    .price,
                                                ).toFixed(2)}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* garlic fingers size end */}
                                        <hr />

                                        {item.infoGarlic.bacon.value != "" && (
                                          <>
                                            {/* extra option size start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    {
                                                      item.infoGarlic.bacon
                                                        .value
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$
                                                    {parseFloat(
                                                      item.infoGarlic.bacon
                                                        .price,
                                                    ).toFixed(2)}
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* extra option size end */}
                                            <hr />
                                          </>
                                        )}
                                        {/* special instruction start */}
                                        {item.infoGarlic
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoGarlic
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoBurger" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.burgerInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>BURGERS</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {item.infoBurger.extraPatty && (
                                          <>
                                            {/* extra patty option start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Patty Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    Add extra one patty
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$4.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* extra patty option end */}
                                            <hr />
                                          </>
                                        )}

                                        {item.infoBurger.makeCombo.comboName !=
                                          "not" && (
                                          <>
                                            {/* Make Combo start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Make Combo
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    {
                                                      item.infoBurger.makeCombo
                                                        .comboName
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$
                                                    {parseFloat(
                                                      item.infoBurger.makeCombo
                                                        .price,
                                                    ).toFixed(2)}
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* make combo end */}
                                            <hr />
                                          </>
                                        )}

                                        {item.infoBurger.drinks != "not" && (
                                          <>
                                            {/* sauce option start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Drinks
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className=" text-[10px] text-p-red">
                                                    {item.infoBurger.drinks}
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* sauce option end */}
                                            <hr />
                                          </>
                                        )}
                                        {/* special instruction start */}
                                        {item.infoBurger
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoBurger
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSalad" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.saladInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>SALADS</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {"saladSize" in item.infoSalad &&
                                          item.saladInfo.name ==
                                            "Donair Salad" && (
                                            <>
                                              {/* salad size start */}
                                              <div className="">
                                                <h3 className="text-[10px] font-semibold text-p-blue">
                                                  Salad Size
                                                </h3>
                                                <ul>
                                                  <li className="flex items-center justify-between">
                                                    <small className=" text-[10px] text-p-red">
                                                      {
                                                        item.infoSalad.saladSize
                                                          .name
                                                      }
                                                    </small>
                                                    <small className="text-[10px] text-p-blue">
                                                      +$
                                                      {parseFloat(
                                                        item.infoSalad.saladSize
                                                          .price,
                                                      ).toFixed(2)}
                                                    </small>
                                                  </li>
                                                </ul>
                                              </div>
                                              {/* salad size end */}
                                              <hr />
                                            </>
                                          )}

                                        {"chooseSauce" in item.infoSalad &&
                                          item.saladInfo.name ==
                                            "Donair Salad" && (
                                            <>
                                              {/* choose sauce start */}
                                              <div className="">
                                                <h3 className="text-[10px] font-semibold text-p-blue">
                                                  Choose Sauce
                                                </h3>
                                                <ul>
                                                  <li>
                                                    <small className=" text-[10px] text-p-red">
                                                      {
                                                        item.infoSalad
                                                          .chooseSauce
                                                      }
                                                    </small>
                                                  </li>
                                                </ul>
                                              </div>
                                              {/* choose sauce end */}
                                              <hr />
                                            </>
                                          )}

                                        {(item.infoSalad.extraOption[0]
                                          .extraName != "" ||
                                          item.infoSalad.extraOption[1]
                                            .extraName != "") && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Cheese & Meat Option
                                              </h3>
                                              <ul>
                                                {item.infoSalad.extraOption.map(
                                                  (el) =>
                                                    el.extraName != "" && (
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {el.extraName}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          +$
                                                          {parseFloat(
                                                            el.extraPrice,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    ),
                                                )}
                                              </ul>
                                            </div>
                                            <hr />
                                          </>
                                        )}
                                        {/* special instruction start */}
                                        {item.infoSalad.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoSalad
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoPasta" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.pastaInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>SPECIALITY PASTA</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* pasta size start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Pasta Size
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between">
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoPasta.pastaSize.size}
                                              </small>
                                              <small className="text-[10px] text-p-blue">
                                                $
                                                {parseFloat(
                                                  item.infoPasta.pastaSize
                                                    .price,
                                                ).toFixed(2)}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* pasta size end */}
                                        <hr />

                                        {item.infoPasta.extraOption
                                          .map((el) =>
                                            el.optionCheck ? true : false,
                                          )
                                          .includes(true) && (
                                          <>
                                            {/* extra add options start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Add Options
                                              </h3>
                                              <ul>
                                                {item.infoPasta.extraOption.map(
                                                  (el) =>
                                                    el.optionName != "" && (
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {el.title}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {el.optionQuantity >
                                                            1 &&
                                                            `${el.optionQuantity}x `}
                                                          +$
                                                          {parseFloat(
                                                            el.optionValue *
                                                              el.optionQuantity,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    ),
                                                )}
                                              </ul>
                                            </div>
                                            {/* extra add options end */}
                                            <hr />
                                          </>
                                        )}
                                        {/* special instruction start */}
                                        {item.infoPasta.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoPasta
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSub" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.subInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>SUB</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {item.infoSub.chooseSauce
                                          .map((el) => el.sauceCheck)
                                          .includes(true) && (
                                          <>
                                            {/* sauce option start */}
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Choose Sauce
                                              </h3>
                                              <ul>
                                                {item.infoSub.chooseSauce.map(
                                                  (el) =>
                                                    el.sauceName != "" && (
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {el.sauceName}
                                                        </small>
                                                      </li>
                                                    ),
                                                )}
                                              </ul>
                                            </div>
                                            {/* sauce option end */}
                                            <hr />
                                          </>
                                        )}

                                        {(item.infoSub.cheeseOption[0]
                                          .extraName != "" ||
                                          item.infoSub.cheeseOption[1]
                                            .extraName != "") && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Cheese & Meat Option
                                              </h3>
                                              <ul>
                                                {item.infoSub.cheeseOption.map(
                                                  (el) =>
                                                    el.extraName != "" && (
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {el.extraName}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          +$
                                                          {parseFloat(
                                                            el.extraPrice,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    ),
                                                )}
                                              </ul>
                                            </div>
                                            <hr />
                                          </>
                                        )}

                                        {item.infoSub.extraAddedTopping
                                          .length != 0 && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Extra Added Toppings
                                              </h3>
                                              <ul>
                                                {item.infoSub.extraAddedTopping?.map(
                                                  (el) => (
                                                    <li className="flex items-center justify-between">
                                                      <small className="text-[10px] text-p-red">
                                                        {el}
                                                      </small>
                                                      <small className="text-[10px] text-p-blue">
                                                        +$1.00
                                                      </small>
                                                    </li>
                                                  ),
                                                )}
                                              </ul>
                                            </div>
                                            <hr />
                                          </>
                                        )}
                                        {/* special instruction start */}
                                        {item.infoSub.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {item.infoSub.specialInstrustions}
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoTwoForOnePizza" in item ? (
                                      <>
                                        {item.twoForOnePizzaInfo.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              <div className="flex items-center justify-between pl-1 bg-p-red">
                                                <h4 className="font-semibold text-[13px] text-p-yellow">
                                                  {pizzaId == 0
                                                    ? "First Pizza "
                                                    : "Second Pizza "}
                                                  {pizzaObj.name}
                                                </h4>
                                                <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                  <small>2 FOR 1 PIZZA</small>
                                                </div>
                                              </div>
                                              {/* header end */}

                                              {pizzaId == 0 && (
                                                <>
                                                  {/* pizza size start */}
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Pizza Size
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between w-full">
                                                        <small className=" text-[10px] text-p-red">
                                                          {item.infoTwoForOnePizza[0].pizzaSize.value
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>

                                                        <small className="text-[10px] text-p-blue">
                                                          $
                                                          {parseFloat(
                                                            item
                                                              .infoTwoForOnePizza[0]
                                                              .pizzaSize.price,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* pizza size end */}
                                                  <hr />
                                                </>
                                              )}

                                              {/* existing topping position start */}
                                              <div className="">
                                                <h3 className="text-[10px] font-semibold text-p-blue">
                                                  Existing Toppings Position
                                                </h3>
                                                <ul className="flex flex-col ">
                                                  {item.infoTwoForOnePizza[
                                                    pizzaId
                                                  ].existingTopPosition.map(
                                                    (el, index) => (
                                                      <li
                                                        className="flex items-center gap-2"
                                                        key={index}
                                                      >
                                                        <small className=" text-[10px] text-p-red">
                                                          {el.title.toUpperCase()}
                                                        </small>
                                                        {el.position ==
                                                        "middle" ? (
                                                          <MdCircle className="text-[18px] text-[#15803d]" />
                                                        ) : el.position ==
                                                          "right" ? (
                                                          <PiCircleHalfFill className="text-[18px] text-[#15803d]" />
                                                        ) : (
                                                          <PiCircleHalfFill className="rotate-[-180deg] text-[18px] text-[#15803d] " />
                                                        )}
                                                      </li>
                                                    ),
                                                  )}
                                                </ul>
                                              </div>
                                              {/* existing topping position end */}
                                              <hr />

                                              {/* crust option start */}
                                              <div className="">
                                                <h3 className="text-[10px] font-semibold text-p-blue">
                                                  Crust Option
                                                </h3>
                                                <ul>
                                                  <li>
                                                    <small className=" text-[10px] text-p-red">
                                                      {item.infoTwoForOnePizza[
                                                        pizzaId
                                                      ].crustOption
                                                        .split(" ")
                                                        .map(
                                                          (el) =>
                                                            el[0].toUpperCase() +
                                                            el.slice(1),
                                                        )
                                                        .join(" ")}
                                                    </small>
                                                  </li>
                                                </ul>
                                              </div>
                                              {/* crust option end */}
                                              <hr />

                                              {/* cheese option start */}
                                              <div className="">
                                                <h3 className="text-[10px] font-semibold text-p-blue">
                                                  Cheese Option
                                                </h3>
                                                <ul>
                                                  <li className="flex items-center justify-between">
                                                    <small className=" text-[10px] text-p-red">
                                                      {item.infoTwoForOnePizza[
                                                        pizzaId
                                                      ].cheeseOption
                                                        .split(" ")
                                                        .map(
                                                          (el) =>
                                                            el[0].toUpperCase() +
                                                            el.slice(1),
                                                        )
                                                        .join(" ")}
                                                    </small>
                                                    <small className="text-[10px] text-p-blue">
                                                      {item.infoTwoForOnePizza[
                                                        pizzaId
                                                      ].cheeseOption ==
                                                        "extra cheese" &&
                                                        "+$3.00"}
                                                    </small>
                                                  </li>
                                                </ul>
                                              </div>
                                              {/* cheese option end */}
                                              <hr />

                                              {/* sauce option start */}
                                              <div className="">
                                                <h3 className="text-[10px] font-semibold text-p-blue">
                                                  Choose Sauce
                                                </h3>
                                                <ul>
                                                  <li>
                                                    <small className=" text-[10px] text-p-red">
                                                      {item.infoTwoForOnePizza[
                                                        pizzaId
                                                      ].sauce
                                                        .split(" ")
                                                        .map(
                                                          (el) =>
                                                            el[0].toUpperCase() +
                                                            el.slice(1),
                                                        )
                                                        .join(" ")}
                                                    </small>
                                                  </li>
                                                </ul>
                                              </div>
                                              {/* sauce option end */}
                                              <hr />

                                              {/* extra topping start */}
                                              {item.infoTwoForOnePizza[pizzaId]
                                                .extraToppingOption.length !=
                                                0 && (
                                                <div className="">
                                                  <h3 className="text-[10px] font-semibold text-p-blue">
                                                    Extra Toppings Option
                                                  </h3>
                                                  <ul className="flex flex-col ">
                                                    {item.infoTwoForOnePizza[
                                                      pizzaId
                                                    ].extraToppingOption?.map(
                                                      (el, index) =>
                                                        el.count != 0 && (
                                                          <li
                                                            className="flex items-center justify-between"
                                                            key={index}
                                                          >
                                                            <div className="flex items-center ">
                                                              <small className=" text-[10px] text-p-red">
                                                                {el.title.toUpperCase()}
                                                              </small>
                                                              {el.position ==
                                                              "middle" ? (
                                                                <MdCircle
                                                                  className={`text-[18px] ${
                                                                    el.count ==
                                                                    1
                                                                      ? "text-[#185316]"
                                                                      : el.count ==
                                                                          2
                                                                        ? "text-[#4f46e5]"
                                                                        : ""
                                                                  }`}
                                                                />
                                                              ) : el.position ==
                                                                "right" ? (
                                                                <PiCircleHalfFill
                                                                  className={`text-[18px] ${
                                                                    el.count ==
                                                                    1
                                                                      ? "text-[#185316]"
                                                                      : el.count ==
                                                                          2
                                                                        ? "text-[#4f46e5]"
                                                                        : ""
                                                                  }`}
                                                                />
                                                              ) : el.position ==
                                                                "left" ? (
                                                                <PiCircleHalfFill
                                                                  className={`rotate-[-180deg] text-[18px] ${
                                                                    el.count ==
                                                                    1
                                                                      ? "text-[#185316]"
                                                                      : el.count ==
                                                                          2
                                                                        ? "text-[#4f46e5]"
                                                                        : ""
                                                                  }`}
                                                                />
                                                              ) : (
                                                                ""
                                                              )}
                                                            </div>
                                                            <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                              {el.count == 2 &&
                                                                "2x"}{" "}
                                                              +$
                                                              {parseFloat(
                                                                el.price,
                                                              ).toFixed(2)}
                                                            </small>
                                                          </li>
                                                        ),
                                                    )}
                                                  </ul>
                                                </div>
                                              )}
                                              {/* extra topping end */}
                                              <hr />
                                            </>
                                          ),
                                        )}
                                        {/* special instruction start */}
                                        {item.infoTwoForOnePizza[0]
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoTwoForOnePizza[0]
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoCan" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            Can of Pop
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>BEVERAGES</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoCan.drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoMlPop" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            710ml Pop
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>BEVERAGES</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoMlPop.drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoLitre" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            2L
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>BEVERAGES</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoLitre.drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoWater" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            Water
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>BEVERAGES</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                Water
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSauce" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.sauceInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>SAUCE</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* special instruction start */}
                                        {item.infoSauce.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoSauce
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSides" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.sidesInfo.name}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>SIDES</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {typeof item.sidesInfo.prices ===
                                          "object" &&
                                          item.sidesInfo.prices.hasOwnProperty(
                                            "medium",
                                          ) && (
                                            <>
                                              <div className="">
                                                <h3 className="text-[10px] font-semibold text-p-blue">
                                                  Sides Size
                                                </h3>
                                                <ul>
                                                  <li className="flex items-center justify-between w-full">
                                                    <small className=" text-[10px] text-p-red">
                                                      {item.infoSides.sideSize
                                                        .split(" ")
                                                        .map(
                                                          (el) =>
                                                            el[0].toUpperCase() +
                                                            el.slice(1),
                                                        )
                                                        .join(" ")}
                                                    </small>

                                                    <small className="text-[10px] text-p-blue">
                                                      $
                                                      {parseFloat(
                                                        item.infoSides
                                                          .sidePrice,
                                                      ).toFixed(2)}
                                                    </small>
                                                  </li>
                                                </ul>
                                              </div>
                                              <hr />
                                            </>
                                          )}
                                        {/* special instruction start */}
                                        {item.infoSides.specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoSides
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSpecialOne" in item ? (
                                      <>
                                        {item.infoSpecialOne.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 1</small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 1 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Second Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 1</small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 2 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Third Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 1</small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {/* Default Toppings start */}

                                              {pizzaId != 3 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.defaultTopping?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}

                                              {pizzaId != 3 && (
                                                <>
                                                  {/* crust option start */}
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId != 3 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj?.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId != 3 &&
                                                pizzaObj.gluteen.option && (
                                                  <>
                                                    {/* cheese option start */}
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Add Gluteen Free
                                                      </h3>
                                                      <ul>
                                                        <li className="flex items-center justify-between">
                                                          <small className="text-[10px] text-p-red">
                                                            {
                                                              pizzaObj.gluteen
                                                                .title
                                                            }
                                                          </small>
                                                          <small className="text-[10px] text-p-blue">
                                                            +$3.00
                                                          </small>
                                                        </li>
                                                      </ul>
                                                    </div>
                                                    {/* cheese option end */}
                                                    <hr />
                                                  </>
                                                )}

                                              {pizzaId != 3 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId != 3 &&
                                                pizzaObj?.extraToppingOption
                                                  .length != 0 && (
                                                  <>
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Extra Toppings Option
                                                      </h3>
                                                      <ul className="flex flex-col ">
                                                        {pizzaObj.extraToppingOption?.map(
                                                          (el, index) =>
                                                            el.count != 0 && (
                                                              <li
                                                                className="flex items-center justify-between"
                                                                key={index}
                                                              >
                                                                <div className="flex items-center ">
                                                                  <small className=" text-[10px] text-p-red">
                                                                    {el.title.toUpperCase()}
                                                                  </small>
                                                                  {el.position ==
                                                                  "middle" ? (
                                                                    <MdCircle
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "right" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "left" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`rotate-[-180deg] text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : (
                                                                    ""
                                                                  )}
                                                                </div>
                                                                <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                  {el.count ==
                                                                    2 && "2x"}
                                                                  +$
                                                                  {parseFloat(
                                                                    el.price,
                                                                  ).toFixed(2)}
                                                                </small>
                                                              </li>
                                                            ),
                                                        )}
                                                      </ul>
                                                    </div>

                                                    <hr />
                                                  </>
                                                )}
                                            </>
                                          ),
                                        )}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoSpecialOne[3].drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}

                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSpecialTwo" in item ? (
                                      <>
                                        {item.infoSpecialTwo.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 2</small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 1 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Second Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 2</small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 2 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Third Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 2</small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {/* Default Toppings start */}

                                              {pizzaId != 3 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.defaultTopping?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}

                                              {pizzaId != 3 && (
                                                <>
                                                  {/* crust option start */}
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId != 3 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj?.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId != 3 &&
                                                pizzaObj.gluteen.option && (
                                                  <>
                                                    {/* cheese option start */}
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Add Gluteen Free
                                                      </h3>
                                                      <ul>
                                                        <li className="flex items-center justify-between">
                                                          <small className="text-[10px] text-p-red">
                                                            {
                                                              pizzaObj.gluteen
                                                                .title
                                                            }
                                                          </small>
                                                          <small className="text-[10px] text-p-blue">
                                                            +$3.00
                                                          </small>
                                                        </li>
                                                      </ul>
                                                    </div>
                                                    {/* cheese option end */}
                                                    <hr />
                                                  </>
                                                )}

                                              {pizzaId != 3 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId != 3 &&
                                                pizzaObj?.extraToppingOption
                                                  .length != 0 && (
                                                  <>
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Extra Toppings Option
                                                      </h3>
                                                      <ul className="flex flex-col ">
                                                        {pizzaObj.extraToppingOption?.map(
                                                          (el, index) =>
                                                            el.count != 0 && (
                                                              <li
                                                                className="flex items-center justify-between"
                                                                key={index}
                                                              >
                                                                <div className="flex items-center ">
                                                                  <small className=" text-[10px] text-p-red">
                                                                    {el.title.toUpperCase()}
                                                                  </small>
                                                                  {el.position ==
                                                                  "middle" ? (
                                                                    <MdCircle
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "right" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "left" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`rotate-[-180deg] text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : (
                                                                    ""
                                                                  )}
                                                                </div>
                                                                <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                  {el.count ==
                                                                    2 &&
                                                                    "2x"}{" "}
                                                                  +$
                                                                  {parseFloat(
                                                                    el.price,
                                                                  ).toFixed(2)}
                                                                </small>
                                                              </li>
                                                            ),
                                                        )}
                                                      </ul>
                                                    </div>

                                                    <hr />
                                                  </>
                                                )}
                                            </>
                                          ),
                                        )}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoSpecialTwo[3].drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}

                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSpecialThree" in item ? (
                                      <>
                                        {item.infoSpecialThree.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 3</small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 1 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Second Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 3</small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {/* Default Toppings start */}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.defaultTopping?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  {/* crust option start */}
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj?.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {(pizzaId == 0 || pizzaId == 1) &&
                                                pizzaObj?.extraToppingOption
                                                  .length != 0 && (
                                                  <>
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Extra Toppings Option
                                                      </h3>
                                                      <ul className="flex flex-col ">
                                                        {pizzaObj.extraToppingOption?.map(
                                                          (el, index) =>
                                                            el.count != 0 && (
                                                              <li
                                                                className="flex items-center justify-between"
                                                                key={index}
                                                              >
                                                                <div className="flex items-center ">
                                                                  <small className=" text-[10px] text-p-red">
                                                                    {el.title.toUpperCase()}
                                                                  </small>
                                                                  {el.position ==
                                                                  "middle" ? (
                                                                    <MdCircle
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "right" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "left" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`rotate-[-180deg] text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : (
                                                                    ""
                                                                  )}
                                                                </div>
                                                                <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                  {el.count ==
                                                                    2 &&
                                                                    "2x"}{" "}
                                                                  +$
                                                                  {parseFloat(
                                                                    el.price,
                                                                  ).toFixed(2)}
                                                                </small>
                                                              </li>
                                                            ),
                                                        )}
                                                      </ul>
                                                    </div>

                                                    <hr />
                                                  </>
                                                )}
                                            </>
                                          ),
                                        )}

                                        {/* Tossed option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Tossed Options (WINGS)
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {
                                                  item.infoSpecialThree[2]
                                                    .tossedOption
                                                }
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* Tossed option end */}
                                        <hr />

                                        {/* Tossed option start */}
                                        {item.infoSpecialThree[2].boneless !=
                                          "" && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Boneless Options (WINGS)
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    {
                                                      item.infoSpecialThree[2]
                                                        .boneless
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>

                                            <hr />
                                          </>
                                        )}

                                        {/* Tossed option end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {
                                                  item.infoSpecialThree[3]
                                                    .drinks
                                                }
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}

                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSpecialFour" in item ? (
                                      <>
                                        {item.infoSpecialFour.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 4</small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 1 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Second Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL 4</small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {/* Default Toppings start */}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.defaultTopping?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  {/* crust option start */}
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj?.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {(pizzaId == 0 ||
                                                pizzaId == 1) && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {(pizzaId == 0 || pizzaId == 1) &&
                                                pizzaObj?.extraToppingOption
                                                  .length != 0 && (
                                                  <>
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Extra Toppings Option
                                                      </h3>
                                                      <ul className="flex flex-col ">
                                                        {pizzaObj.extraToppingOption?.map(
                                                          (el, index) =>
                                                            el.count != 0 && (
                                                              <li
                                                                className="flex items-center justify-between"
                                                                key={index}
                                                              >
                                                                <div className="flex items-center ">
                                                                  <small className=" text-[10px] text-p-red">
                                                                    {el.title.toUpperCase()}
                                                                  </small>
                                                                  {el.position ==
                                                                  "middle" ? (
                                                                    <MdCircle
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "right" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "left" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`rotate-[-180deg] text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : (
                                                                    ""
                                                                  )}
                                                                </div>
                                                                <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                  {el.count ==
                                                                    2 &&
                                                                    "2x"}{" "}
                                                                  +$
                                                                  {parseFloat(
                                                                    el.price,
                                                                  ).toFixed(2)}
                                                                </small>
                                                              </li>
                                                            ),
                                                        )}
                                                      </ul>
                                                    </div>

                                                    <hr />
                                                  </>
                                                )}
                                            </>
                                          ),
                                        )}

                                        {/* Tossed option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Tossed Options (WINGS)
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {
                                                  item.infoSpecialFour[2]
                                                    .tossedOption
                                                }
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* Tossed option end */}
                                        <hr />

                                        {/* Tossed option start */}
                                        {item.infoSpecialFour[2].boneless !=
                                          "" && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Boneless Options (WINGS)
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    {
                                                      item.infoSpecialFour[2]
                                                        .boneless
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>

                                            <hr />
                                          </>
                                        )}

                                        {/* Tossed option end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoSpecialFour[3].drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}

                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSpecialFive" in item ? (
                                      <>
                                        {item.infoSpecialFive.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL A</small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {/* Default Toppings start */}
                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.defaultTopping?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}

                                              {pizzaId == 0 && (
                                                <>
                                                  {/* crust option start */}
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj?.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 &&
                                                pizzaObj?.extraToppingOption
                                                  .length != 0 && (
                                                  <>
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Extra Toppings Option
                                                      </h3>
                                                      <ul className="flex flex-col ">
                                                        {pizzaObj.extraToppingOption?.map(
                                                          (el, index) =>
                                                            el.count != 0 && (
                                                              <li
                                                                className="flex items-center justify-between"
                                                                key={index}
                                                              >
                                                                <div className="flex items-center ">
                                                                  <small className=" text-[10px] text-p-red">
                                                                    {el.title.toUpperCase()}
                                                                  </small>
                                                                  {el.position ==
                                                                  "middle" ? (
                                                                    <MdCircle
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "right" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "left" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`rotate-[-180deg] text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : (
                                                                    ""
                                                                  )}
                                                                </div>
                                                                <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                  {el.count ==
                                                                    2 &&
                                                                    "2x"}{" "}
                                                                  +$
                                                                  {parseFloat(
                                                                    el.price,
                                                                  ).toFixed(2)}
                                                                </small>
                                                              </li>
                                                            ),
                                                        )}
                                                      </ul>
                                                    </div>

                                                    <hr />
                                                  </>
                                                )}
                                            </>
                                          ),
                                        )}

                                        {/* Tossed option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Tossed Options (WINGS)
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {
                                                  item.infoSpecialFive[1]
                                                    .tossedOption
                                                }
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* Tossed option end */}
                                        <hr />

                                        {/* Tossed option start */}
                                        {item.infoSpecialFive[1].boneless !=
                                          "" && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Boneless Options (WINGS)
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    {
                                                      item.infoSpecialFive[1]
                                                        .boneless
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>

                                            <hr />
                                          </>
                                        )}

                                        {/* Tossed option end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoSpecialFive[2].drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}

                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoSpecialSix" in item ? (
                                      <>
                                        {item.infoSpecialSix.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>SPECIAL B</small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {/* Default Toppings start */}
                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.defaultTopping?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}

                                              {pizzaId == 0 && (
                                                <>
                                                  {/* crust option start */}
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj?.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj?.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>

                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 &&
                                                pizzaObj?.extraToppingOption
                                                  .length != 0 && (
                                                  <>
                                                    <div className="">
                                                      <h3 className="text-[10px] font-semibold text-p-blue">
                                                        Extra Toppings Option
                                                      </h3>
                                                      <ul className="flex flex-col ">
                                                        {pizzaObj.extraToppingOption?.map(
                                                          (el, index) =>
                                                            el.count != 0 && (
                                                              <li
                                                                className="flex items-center justify-between"
                                                                key={index}
                                                              >
                                                                <div className="flex items-center ">
                                                                  <small className=" text-[10px] text-p-red">
                                                                    {el.title.toUpperCase()}
                                                                  </small>
                                                                  {el.position ==
                                                                  "middle" ? (
                                                                    <MdCircle
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "right" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : el.position ==
                                                                    "left" ? (
                                                                    <PiCircleHalfFill
                                                                      className={`rotate-[-180deg] text-[18px] ${
                                                                        el.count ==
                                                                        1
                                                                          ? "text-[#185316]"
                                                                          : el.count ==
                                                                              2
                                                                            ? "text-[#4f46e5]"
                                                                            : ""
                                                                      }`}
                                                                    />
                                                                  ) : (
                                                                    ""
                                                                  )}
                                                                </div>
                                                                <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                  {el.count ==
                                                                    2 &&
                                                                    "2x"}{" "}
                                                                  +$
                                                                  {parseFloat(
                                                                    el.price,
                                                                  ).toFixed(2)}
                                                                </small>
                                                              </li>
                                                            ),
                                                        )}
                                                      </ul>
                                                    </div>

                                                    <hr />
                                                  </>
                                                )}

                                              {/* Default Toppings start */}

                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Donair Toppings (DONAIR)
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.donairTopping?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el.checked &&
                                                                el.title}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}

                                              {/* Default Toppings start */}
                                              {pizzaId == 0 && (
                                                <>
                                                  <div className="">
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Donair Sauce (DONAIR)
                                                    </h3>
                                                    <ul>
                                                      {pizzaObj.donairSauce?.map(
                                                        (el) => (
                                                          <li>
                                                            <small className=" text-[10px] text-p-red">
                                                              {el.checked &&
                                                                el.title}
                                                            </small>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              )}
                                              {/* Default Toppings end */}
                                            </>
                                          ),
                                        )}

                                        {/* Tossed option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Tossed Options (WINGS)
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {
                                                  item.infoSpecialSix[1]
                                                    .tossedOption
                                                }
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* Tossed option end */}
                                        <hr />

                                        {/* Tossed option start */}
                                        {item.infoSpecialSix[1].boneless !=
                                          "" && (
                                          <>
                                            <div className="">
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Boneless Options (WINGS)
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    {
                                                      item.infoSpecialSix[1]
                                                        .boneless
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>

                                            <hr />
                                          </>
                                        )}
                                        {/* Tossed option end */}

                                        {/* drinks option start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Drinks
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoSpecialSix[2].drinks}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* drinks option end */}

                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoWalkIn" in item ? (
                                      <>
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            Walk-In Special
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>WALK-IN SPECIAL ONLY</small>
                                          </div>
                                        </div>

                                        {/* comes with options start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Walk-in Specials
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoWalkIn.walkIn}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* comes with options end */}

                                        <hr />

                                        {/* total qty start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div className="">
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>

                                        {/* total amount end */}
                                      </>
                                    ) : "infoCustomSingle" in item ? (
                                      <>
                                        {/* header start */}
                                        <div className="flex items-center justify-between pl-1 bg-p-red">
                                          <h4 className="font-semibold text-[13px] text-p-yellow">
                                            {item.customSingleInfo.title}
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                            <small>OWN PIZZA</small>
                                          </div>
                                        </div>
                                        {/* header end */}

                                        {/* pizza size start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Pizza Size
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between w-full">
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoCustomSingle.pizzaSize
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>

                                              <small className="text-[10px] text-p-blue">
                                                $
                                                {parseFloat(
                                                  item.infoCustomSingle
                                                    .pizzaSizeData,
                                                ).toFixed(2)}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* pizza size end */}
                                        <hr />

                                        {/* extra topping start */}
                                        {item.infoCustomSingle
                                          .extraToppingOption.length != 0 && (
                                          <>
                                            <div>
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Default Toppings
                                              </h3>
                                              <ul className="flex flex-col ">
                                                {item.infoCustomSingle.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center ">
                                                          <small className=" text-[10px] text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[18px] ${
                                                                el.count == 1
                                                                  ? "text-[#185316]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[18px] ${
                                                                el.count == 1
                                                                  ? "text-[#185316]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[18px] ${
                                                                el.count == 1
                                                                  ? "text-[#185316]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : (
                                                            ""
                                                          )}
                                                        </div>
                                                        <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                          {el.count == 2 &&
                                                            "2x"}{" "}
                                                          +$
                                                          {parseFloat(
                                                            el.price,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    ),
                                                )}
                                              </ul>
                                            </div>
                                            <hr />
                                          </>
                                        )}
                                        {/* extra topping end */}

                                        {/* crust option start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Crust Option
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoCustomSingle.crustOption
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* crust option end */}
                                        <hr />

                                        {/* cheese option start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Cheese Option
                                          </h3>
                                          <ul>
                                            <li className="flex items-center justify-between">
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoCustomSingle.cheeseOption
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>
                                              <small className="text-[10px] text-p-blue">
                                                {item.infoCustomSingle
                                                  .cheeseOption ==
                                                  "extra cheese" && "+$3.00"}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* cheese option end */}
                                        <hr />

                                        {item.infoCustomSingle.gluteen
                                          .option && (
                                          <>
                                            {/* cheese option start */}
                                            <div>
                                              <h3 className="text-[10px] font-semibold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className=" text-[10px] text-p-red">
                                                    {
                                                      item.infoCustomSingle
                                                        .gluteen.title
                                                    }
                                                  </small>
                                                  <small className="text-[10px] text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* cheese option end */}
                                            <hr />
                                          </>
                                        )}

                                        {/* sauce option start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Choose Sauce
                                          </h3>
                                          <ul>
                                            <li>
                                              <small className=" text-[10px] text-p-red">
                                                {item.infoCustomSingle.sauce
                                                  .split(" ")
                                                  .map(
                                                    (el) =>
                                                      el[0].toUpperCase() +
                                                      el.slice(1),
                                                  )
                                                  .join(" ")}
                                              </small>
                                            </li>
                                          </ul>
                                        </div>
                                        {/* sauce option end */}
                                        <hr />
                                        {/* special instruction start */}
                                        {item.infoCustomSingle
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoCustomSingle
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>
                                      </>
                                    ) : "infoCustomTwoForOne" in item ? (
                                      <>
                                        {item.infoCustomTwoForOne.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>
                                                      CUSTOM 2 FOR 1 PIZZA
                                                    </small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 1 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Second Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>
                                                      CUSTOM 2 FOR 1 PIZZA
                                                    </small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {pizzaId == 0 && (
                                                <>
                                                  {/* pizza size start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Pizza Size
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between w-full">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.pizzaSize
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>

                                                        <small className="text-[10px] text-p-blue">
                                                          $
                                                          {parseFloat(
                                                            pizzaObj.pizzaSizeData,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* pizza size end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul className="flex flex-col ">
                                                      {pizzaObj.extraToppingOption?.map(
                                                        (el, index) =>
                                                          el.count != 0 && (
                                                            <li
                                                              className="flex items-center justify-between"
                                                              key={index}
                                                            >
                                                              <div className="flex items-center ">
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el.title.toUpperCase()}
                                                                </small>
                                                                {el.position ==
                                                                "middle" ? (
                                                                  <MdCircle
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "right" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "left" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`rotate-[-180deg] text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : (
                                                                  ""
                                                                )}
                                                              </div>
                                                              <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                {el.count ==
                                                                  2 &&
                                                                  "2x"}{" "}
                                                                +$
                                                                {parseFloat(
                                                                  el.price,
                                                                ).toFixed(2)}
                                                              </small>
                                                            </li>
                                                          ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Default Toppings
                                                    </h3>
                                                    <ul className="flex flex-col">
                                                      {pizzaObj.extraToppingOption?.map(
                                                        (el, index) =>
                                                          el.count != 0 && (
                                                            <li
                                                              className="flex items-center justify-between"
                                                              key={index}
                                                            >
                                                              <div className="flex items-center ">
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el.title.toUpperCase()}
                                                                </small>
                                                                {el.position ==
                                                                "middle" ? (
                                                                  <MdCircle
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "right" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "left" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`rotate-[-180deg] text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : (
                                                                  ""
                                                                )}
                                                              </div>
                                                              <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                {el.count ==
                                                                  2 &&
                                                                  "2x"}{" "}
                                                                +$
                                                                {parseFloat(
                                                                  el.price,
                                                                ).toFixed(2)}
                                                              </small>
                                                            </li>
                                                          ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* crust option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* crust option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaObj.gluteen.option && (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Add Gluteen Free
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {
                                                            pizzaObj.gluteen
                                                              .title
                                                          }
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          +$3.00
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* sauce option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* sauce option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* sauce option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* sauce option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}
                                            </>
                                          ),
                                        )}
                                        {/* special instruction start */}
                                        {item.infoCustomTwoForOne[0]
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoCustomTwoForOne[0]
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>
                                      </>
                                    ) : "infoCustomTwoTopping" in item ? (
                                      <>
                                        {item.infoCustomTwoTopping.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>
                                                      CUSTOM 2 FOR 1 TWO TOPPING
                                                    </small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 1 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Second Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>
                                                      CUSTOM 2 FOR 1 TWO TOPPING
                                                    </small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {pizzaId == 0 && (
                                                <>
                                                  {/* pizza size start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Pizza Size
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between w-full">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.pizzaSize
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>

                                                        <small className="text-[10px] text-p-blue">
                                                          $
                                                          {parseFloat(
                                                            pizzaObj.pizzaSizeData,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* pizza size end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {pizzaObj.defaultTopping
                                                    .length !== 0 && (
                                                    <>
                                                      <div>
                                                        <h3 className="text-[10px] font-semibold text-p-blue">
                                                          Default Toppings
                                                        </h3>
                                                        <ul>
                                                          {pizzaObj.defaultTopping.map(
                                                            (el) => (
                                                              <li>
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el}
                                                                </small>
                                                              </li>
                                                            ),
                                                          )}
                                                        </ul>
                                                      </div>
                                                      <hr />
                                                    </>
                                                  )}
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {pizzaObj.defaultTopping
                                                    .length !== 0 && (
                                                    <>
                                                      <div>
                                                        <h3 className="text-[10px] font-semibold text-p-blue">
                                                          Default Toppings
                                                        </h3>
                                                        <ul>
                                                          {pizzaObj.defaultTopping.map(
                                                            (el) => (
                                                              <li>
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el}
                                                                </small>
                                                              </li>
                                                            ),
                                                          )}
                                                        </ul>
                                                      </div>
                                                      <hr />
                                                    </>
                                                  )}
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Extra Toppings Option
                                                    </h3>
                                                    <ul className="flex flex-col ">
                                                      {pizzaObj.extraToppingOption?.map(
                                                        (el, index) =>
                                                          el.count != 0 && (
                                                            <li
                                                              className="flex items-center justify-between"
                                                              key={index}
                                                            >
                                                              <div className="flex items-center ">
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el.title.toUpperCase()}
                                                                </small>
                                                                {el.position ==
                                                                "middle" ? (
                                                                  <MdCircle
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "right" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "left" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`rotate-[-180deg] text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : (
                                                                  ""
                                                                )}
                                                              </div>
                                                              <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                {el.count ==
                                                                  2 &&
                                                                  "2x"}{" "}
                                                                +$
                                                                {parseFloat(
                                                                  el.price,
                                                                ).toFixed(2)}
                                                              </small>
                                                            </li>
                                                          ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Extra Toppings Option
                                                    </h3>
                                                    <ul className="flex flex-col ">
                                                      {pizzaObj.extraToppingOption?.map(
                                                        (el, index) =>
                                                          el.count != 0 && (
                                                            <li
                                                              className="flex items-center justify-between"
                                                              key={index}
                                                            >
                                                              <div className="flex items-center ">
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el.title.toUpperCase()}
                                                                </small>
                                                                {el.position ==
                                                                "middle" ? (
                                                                  <MdCircle
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "right" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "left" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`rotate-[-180deg] text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : (
                                                                  ""
                                                                )}
                                                              </div>
                                                              <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                {el.count ==
                                                                  2 &&
                                                                  "2x"}{" "}
                                                                +$
                                                                {parseFloat(
                                                                  el.price,
                                                                ).toFixed(2)}
                                                              </small>
                                                            </li>
                                                          ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* crust option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* crust option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaObj.gluteen.option && (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Add Gluteen Free
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {
                                                            pizzaObj.gluteen
                                                              .title
                                                          }
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          +$3.00
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* sauce option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* sauce option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* sauce option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* sauce option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}
                                            </>
                                          ),
                                        )}
                                        {/* special instruction start */}
                                        {item.infoCustomTwoTopping[0]
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoCustomTwoTopping[0]
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>
                                      </>
                                    ) : "infoCustomThreeTopping" in item ? (
                                      <>
                                        {item.infoCustomThreeTopping.map(
                                          (pizzaObj, pizzaId) => (
                                            <>
                                              {/* header start */}
                                              {pizzaId == 0 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    First Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>
                                                      CUSTOM 2 FOR 1 THREE
                                                      TOPPING
                                                    </small>
                                                  </div>
                                                </div>
                                              ) : pizzaId == 1 ? (
                                                <div className="flex items-center justify-between pl-1 bg-p-red">
                                                  <h4 className="font-semibold text-[13px] text-p-yellow">
                                                    Second Pizza
                                                  </h4>
                                                  <div className="p-1 font-semibold bg-white rounded-sm text-[10px] text-p-blue">
                                                    <small>
                                                      CUSTOM 2 FOR 1 THREE
                                                      TOPPING
                                                    </small>
                                                  </div>
                                                </div>
                                              ) : (
                                                ""
                                              )}
                                              {/* header end */}

                                              {pizzaId == 0 && (
                                                <>
                                                  {/* pizza size start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Pizza Size
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between w-full">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.pizzaSize
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>

                                                        <small className="text-[10px] text-p-blue">
                                                          $
                                                          {parseFloat(
                                                            pizzaObj.pizzaSizeData,
                                                          ).toFixed(2)}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* pizza size end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {pizzaObj.defaultTopping
                                                    .length !== 0 && (
                                                    <>
                                                      <div>
                                                        <h3 className="text-[10px] font-semibold text-p-blue">
                                                          Default Toppings
                                                        </h3>
                                                        <ul>
                                                          {pizzaObj.defaultTopping.map(
                                                            (el) => (
                                                              <li>
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el}
                                                                </small>
                                                              </li>
                                                            ),
                                                          )}
                                                        </ul>
                                                      </div>
                                                      <hr />
                                                    </>
                                                  )}
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {pizzaObj.defaultTopping
                                                    .length !== 0 && (
                                                    <>
                                                      <div>
                                                        <h3 className="text-[10px] font-semibold text-p-blue">
                                                          Default Toppings
                                                        </h3>
                                                        <ul>
                                                          {pizzaObj.defaultTopping.map(
                                                            (el) => (
                                                              <li>
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el}
                                                                </small>
                                                              </li>
                                                            ),
                                                          )}
                                                        </ul>
                                                      </div>
                                                      <hr />
                                                    </>
                                                  )}
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Extra Toppings Option
                                                    </h3>
                                                    <ul className="flex flex-col ">
                                                      {pizzaObj.extraToppingOption?.map(
                                                        (el, index) =>
                                                          el.count != 0 && (
                                                            <li
                                                              className="flex items-center justify-between"
                                                              key={index}
                                                            >
                                                              <div className="flex items-center ">
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el.title.toUpperCase()}
                                                                </small>
                                                                {el.position ==
                                                                "middle" ? (
                                                                  <MdCircle
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "right" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "left" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`rotate-[-180deg] text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : (
                                                                  ""
                                                                )}
                                                              </div>
                                                              <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                {el.count ==
                                                                  2 &&
                                                                  "2x"}{" "}
                                                                +$
                                                                {parseFloat(
                                                                  el.price,
                                                                ).toFixed(2)}
                                                              </small>
                                                            </li>
                                                          ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Extra Toppings Option
                                                    </h3>
                                                    <ul className="flex flex-col ">
                                                      {pizzaObj.extraToppingOption?.map(
                                                        (el, index) =>
                                                          el.count != 0 && (
                                                            <li
                                                              className="flex items-center justify-between"
                                                              key={index}
                                                            >
                                                              <div className="flex items-center ">
                                                                <small className=" text-[10px] text-p-red">
                                                                  {el.title.toUpperCase()}
                                                                </small>
                                                                {el.position ==
                                                                "middle" ? (
                                                                  <MdCircle
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "right" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : el.position ==
                                                                  "left" ? (
                                                                  <PiCircleHalfFill
                                                                    className={`rotate-[-180deg] text-[18px] ${
                                                                      el.count ==
                                                                      1
                                                                        ? "text-[#185316]"
                                                                        : el.count ==
                                                                            2
                                                                          ? "text-[#4f46e5]"
                                                                          : ""
                                                                    }`}
                                                                  />
                                                                ) : (
                                                                  ""
                                                                )}
                                                              </div>
                                                              <small className="text-[10px] flex items-center gap-1  text-p-blue">
                                                                {el.count ==
                                                                  2 &&
                                                                  "2x"}{" "}
                                                                +$
                                                                {parseFloat(
                                                                  el.price,
                                                                ).toFixed(2)}
                                                              </small>
                                                            </li>
                                                          ),
                                                      )}
                                                    </ul>
                                                  </div>
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* crust option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* crust option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Crust Option
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.crustOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* crust option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Cheese Option
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.cheeseOption
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          {pizzaObj.cheeseOption ==
                                                            "extra cheese" &&
                                                            "+$3.00"}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}

                                              {pizzaObj.gluteen.option && (
                                                <>
                                                  {/* cheese option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Add Gluteen Free
                                                    </h3>
                                                    <ul>
                                                      <li className="flex items-center justify-between">
                                                        <small className=" text-[10px] text-p-red">
                                                          {
                                                            pizzaObj.gluteen
                                                              .title
                                                          }
                                                        </small>
                                                        <small className="text-[10px] text-p-blue">
                                                          +$3.00
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* cheese option end */}
                                                  <hr />
                                                </>
                                              )}

                                              {pizzaId == 0 ? (
                                                <>
                                                  {/* sauce option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* sauce option end */}
                                                  <hr />
                                                </>
                                              ) : pizzaId == 1 ? (
                                                <>
                                                  {/* sauce option start */}
                                                  <div>
                                                    <h3 className="text-[10px] font-semibold text-p-blue">
                                                      Choose Sauce
                                                    </h3>
                                                    <ul>
                                                      <li>
                                                        <small className=" text-[10px] text-p-red">
                                                          {pizzaObj.sauce
                                                            .split(" ")
                                                            .map(
                                                              (el) =>
                                                                el[0].toUpperCase() +
                                                                el.slice(1),
                                                            )
                                                            .join(" ")}
                                                        </small>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  {/* sauce option end */}
                                                  <hr />
                                                </>
                                              ) : (
                                                ""
                                              )}
                                            </>
                                          ),
                                        )}
                                        {/* special instruction start */}
                                        {item.infoCustomThreeTopping[0]
                                          .specialInstrustions && (
                                          <div className="">
                                            <h3 className="text-[10px] font-semibold text-p-blue">
                                              Special Instruction
                                            </h3>
                                            <small className=" text-[10px] text-p-red">
                                              {
                                                item.infoCustomThreeTopping[0]
                                                  .specialInstrustions
                                              }
                                            </small>
                                          </div>
                                        )}
                                        {/* special instruction end */}
                                        <hr />

                                        {/* total qty start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Qty
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Qty
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              {item.quantity} pcs
                                            </small>
                                          </div>
                                        </div>
                                        {/* total qty end */}
                                        <hr />
                                        {/* total amount start */}
                                        <div>
                                          <h3 className="text-[10px] font-semibold text-p-blue">
                                            Total Amount
                                          </h3>
                                          <div className="flex items-center justify-between">
                                            <small className=" text-[10px] text-p-red">
                                              Total
                                            </small>
                                            <small className="text-[10px] text-p-blue ">
                                              $
                                              {parseFloat(
                                                Number(
                                                  item.totalPrice.split("$")[1],
                                                ) * item.quantity,
                                              ).toFixed(2)}
                                            </small>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      ""
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* all item loop here end */}

                          {/* total counting start */}
                          <p className="text-[12px] w-full border-t pt-1 text-center text-p-red">
                            Total Amounts
                          </p>
                          <div className="flex flex-col w-full border-t border-b">
                            {invoiceData?.discountAmount?.split("$").length >
                              1 && (
                              <div className="flex items-center justify-between">
                                <p className=" text-[12px] capitalize text-p-blue">
                                  Discount
                                </p>
                                <p className="text-[12px] capitalize text-p-red">
                                  - CAD {invoiceData?.discountAmount}
                                </p>
                              </div>
                            )}

                            {invoiceData?.tipAmount?.split("$")[1] && (
                              <div className="flex items-center justify-between">
                                <p className=" text-[12px] capitalize text-p-blue">
                                  Tip
                                </p>
                                <p className="text-[12px] capitalize text-p-blue">
                                  CAD {invoiceData?.tipAmount}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <p className=" text-[12px] capitalize text-p-blue">
                                Subtotal
                              </p>
                              <p className="text-[12px] capitalize text-p-blue">
                                CAD $
                                {invoiceData?.service === "delivery"
                                  ? parseFloat(
                                      Number(
                                        invoiceData?.orderPrice.split("$")[1],
                                      ) -
                                        5 -
                                        Number(
                                          invoiceData?.orderPriceTax.split(
                                            "$",
                                          )[1],
                                        ),
                                    ).toFixed(2)
                                  : parseFloat(
                                      Number(
                                        invoiceData?.orderPrice.split("$")[1],
                                      ) -
                                        Number(
                                          invoiceData?.orderPriceTax.split(
                                            "$",
                                          )[1],
                                        ),
                                    ).toFixed(2)}
                              </p>
                            </div>

                            {invoiceData?.service === "delivery" && (
                              <div className="flex items-center justify-between">
                                <p className="text-[12px] capitalize text-p-blue">
                                  Delivery Charge
                                </p>
                                <p className="text-[12px] capitalize text-p-blue">
                                  CAD $5.00
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <p className="text-[12px] capitalize text-p-blue">
                                TAX
                              </p>
                              <p className="text-[12px] capitalize text-p-blue">
                                CAD {invoiceData?.orderPriceTax}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[12px] capitalize text-p-blue">
                                Amount Paid
                              </p>
                              <p className="text-[12px] capitalize text-p-blue">
                                CAD {invoiceData?.orderPrice}
                              </p>
                            </div>
                          </div>
                          {/* total counting end */}
                          <p className="px-3 pb-1 text-center text-p-red">
                            <small>
                              Thank you for ordering from jomaa's Pizza & Donair
                              - Capilano
                            </small>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          handlePrint(null, () => contentToPrint.current);
                        }}
                        className="!inline-block bg-gray-500 px-[10px] py-[8px]
        text-[14px] font-semibold text-white hover:opacity-[0.6]"
                      >
                        Download Invoice
                      </button>
                    </>
                  ) : (
                    ""
                  )}
                </div>
              </div>
            </div>
          )}
          {/* order details modal end */}
        </div>
      </div>
    </div>
  );
};

export default page;
