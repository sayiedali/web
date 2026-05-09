"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { FaTimesCircle } from "react-icons/fa";
import { LiaSearchSolid } from "react-icons/lia";
import { MdCircle } from "react-icons/md";
import { PiCircleHalfFill } from "react-icons/pi";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import apiUrl from "@/app/_host/apiURL";
import {
  matchesBranch,
  matchesOrderCondition,
  parseOrderArray,
} from "@/app/dashboard/_utils/orderTracking";

const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const REJECTED_ORDER_ENDPOINTS = [
  "/api/v1/order/rejectOrder",
  "/api/v1/order/rejected",
  "/api/v1/orders/rejected",
];

const parseApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const page = () => {
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [allConfirmOrder, setAllConfirmOrder] = useState([]);
  let data = useSelector((state) => state);
  let [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );

  //  get all confirmed order
  useEffect(() => {
    const loadRejectedOrders = async () => {
      let lastError;
      for (const endpoint of REJECTED_ORDER_ENDPOINTS) {
        try {
          const res = await axios.get(`${apiUrl}${endpoint}`, {
            auth: { username: "user", password: getToken },
          });
          setAllConfirmOrder(parseOrderArray(res.data));
          return;
        } catch (error) {
          lastError = error;
          if (error?.response?.status !== 404) break;
        }
      }
      setAllConfirmOrder([]);
      toast.error(parseApiError(lastError, "Unable to load rejected orders."));
    };

    loadRejectedOrders();
  }, []);

  const [orderDetailObj, setOrderDetailObj] = useState();

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

  const handleDeleteOrder = (id) => {
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/order/orderdelete`,
      headers: {
        "Content-Type": "application/json",
      },
      data: { id },
      auth: {
        username: "user",
        password: postToken,
      },
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          toast.success("Order Delete Successful.");
          setAllConfirmOrder((prev) => {
            return prev.filter((el) => el._id != response.data.data);
          });
        } else {
          toast.error("Order Delete Fail!");
        }
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Order delete failed."));
      });
  };

  return (
    <div className="pt-[80px] p-[10px] w-full">
      <div className="confirmOrder-head mb-[50px]">
        <h2 className="mt-5 text-3xl font-bold text-center text-p-red">
          Rejected Orders
        </h2>
      </div>

      <div className="w-full pendingOrder-search mt-[40px] pb-[30px] flex justify-end items-center">
        <div className="search-right">
          <h2 className="font-bold text-[20px] text-p-red mb-[20px]">
            Search By Order ID
          </h2>
          <form action="">
            <div className=" flex gap-2 items-center border border-red p-[15px] rounded-lg">
              <LiaSearchSolid className="text-[30px]" />
              <input
                className="w-full outline-none"
                type="text"
                placeholder="Search"
              />
            </div>
          </form>
        </div>
      </div>

      <ToastContainer position="top-center" />

      <div className="confirmOrder-main">
        <div className="flex flex-col-reverse confirmOrder-inner">
          {allConfirmOrder &&
            allConfirmOrder.map(
              (item, index) =>
                matchesOrderCondition(item, "reject") &&
                matchesBranch(item, branch) && (
                  <div
                    key={index}
                    className="rounded-lg shadow-lg bg-[#f6f6f6] p-[25px] my-[15px] w-full"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="  font-bold text-[25px] text-p-blue">
                          Order ID:
                          <span className="pl-2 text-p-red">{item._id}</span>
                        </p>
                      </div>
                      <hr />

                      {/* order details start */}
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="  font-bold text-[25px] text-p-blue">
                          Order Details:
                        </p>
                        <p className="px-3 py-2 font-semibold rounded-md bg-p-blue">
                          <span className="text-white">{item.service}</span>
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
                        {item.orderTime && (
                          <p className="px-3 py-2 font-semibold rounded-md bg-sky-600">
                            <span className="text-white">
                              Time : {item.orderTime}
                            </span>
                          </p>
                        )}

                        <p className="px-3 py-2 font-semibold bg-gray-600 rounded-md ">
                          <span className="text-white">
                            Payment Method : {item.payment}
                          </span>
                        </p>

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
                      {/* user account detils start */}
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
                    <div className="flex justify-end gap-3">
                      <button
                        className="font-semibold text-[20px] text-white bg-blue-500 px-[30px] py-[5px] rounded-lg"
                        onClick={() => {
                          setOrderDetailObj({
                            orderNote: item.orderNote,
                            orderId: item._id,
                            orderList: item.orderDetails,
                          });
                          setShowOrderDetail(true);
                        }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(item._id)}
                        className="px-[30px] py-[5px] rounded-lg bg-red-500 text-white font-semibold text-[18px] cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
            )}

          {/* order details modal start */}
          {showOrderDetail && (
            <div className="z-[9999999] fixed left-0 top-0  flex h-[100vh] w-full justify-center overflow-y-scroll  bg-[#000000cd] px-[10px] py-[20px]">
              <div className="relative w-full   rounded-lg bg-[#f3f3f3] py-5 pl-3 pr-1 md:w-[350px] lg:w-[450px]">
                <div className="absolute  right-[-10px] top-[-10px] h-[20px] w-[20px] rounded-full bg-white text-[30px]"></div>
                <FaTimesCircle
                  onClick={() => {
                    setOrderDetailObj();
                    setShowOrderDetail(false);
                  }}
                  className="absolute right-[-15px]  top-[-15px] cursor-pointer text-[30px] text-p-blue"
                />
                <div className="w-full h-full overflow-y-scroll">
                  {/* order note start */}
                  <div className="mb-3">
                    <h4 className="text-[20px] mb-2 font-semibold text-p-red text-center">
                      ORDER NOTE
                    </h4>
                    <p className="text-center text-p-blue">
                      {orderDetailObj?.orderNote}
                    </p>
                  </div>
                  {/* order note end */}
                  {/* rest of your ordered product loop start */}
                  {orderDetailObj?.orderList.map((item) => (
                    <>
                      {"infoPizza" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.pizzaInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>PIZZA</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* pizza size start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Pizza Size
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between w-full">
                                      <small className="font-semibold text-p-red">
                                        {item.infoPizza.pizzaSize
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
                                          )
                                          .join(" ")}
                                      </small>

                                      <small className="font-semibold text-p-blue">
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Existing Toppings Position
                                  </h3>
                                  <ul className="flex flex-col gap-2">
                                    {item.infoPizza.existingTopPosition.map(
                                      (el, index) => (
                                        <li
                                          className="flex items-center gap-2"
                                          key={index}
                                        >
                                          <small className="font-semibold text-p-red">
                                            {el.title.toUpperCase()}
                                          </small>
                                          {el.position == "middle" ? (
                                            <MdCircle className="text-[25px] text-[#15803d]" />
                                          ) : el.position == "right" ? (
                                            <PiCircleHalfFill className="text-[25px] text-[#15803d]" />
                                          ) : (
                                            <PiCircleHalfFill className="rotate-[-180deg] text-[25px] text-[#15803d] " />
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Crust Option
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoPizza.crustOption
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Cheese Option
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red">
                                        {item.infoPizza.cheeseOption
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
                                          )
                                          .join(" ")}
                                      </small>
                                      <small className="font-semibold text-p-blue">
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
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Add Gluteen Free
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {item.infoPizza.gluteen.title}
                                          </small>
                                          <small className="font-semibold text-p-blue">
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Choose Sauce
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoPizza.sauce
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
                                          )
                                          .join(" ")}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* sauce option end */}
                                <hr />

                                {/* extra topping start */}
                                {item.infoPizza.extraToppingOption.length !=
                                  0 && (
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Extra Toppings Option
                                    </h3>
                                    <ul className="flex flex-col gap-2">
                                      {item.infoPizza.extraToppingOption?.map(
                                        (el, index) =>
                                          el.count != 0 && (
                                            <li
                                              className="flex items-center justify-between"
                                              key={index}
                                            >
                                              <div className="flex items-center gap-2 ">
                                                <small className="font-semibold font text-p-red">
                                                  {el.title.toUpperCase()}
                                                </small>
                                                {el.position == "middle" ? (
                                                  <MdCircle
                                                    className={`text-[25px] ${
                                                      el.count == 1
                                                        ? "text-[#facc15]"
                                                        : el.count == 2
                                                          ? "text-[#4f46e5]"
                                                          : ""
                                                    }`}
                                                  />
                                                ) : el.position == "right" ? (
                                                  <PiCircleHalfFill
                                                    className={`text-[25px] ${
                                                      el.count == 1
                                                        ? "text-[#facc15]"
                                                        : el.count == 2
                                                          ? "text-[#4f46e5]"
                                                          : ""
                                                    }`}
                                                  />
                                                ) : el.position == "left" ? (
                                                  <PiCircleHalfFill
                                                    className={`rotate-[-180deg] text-[25px] ${
                                                      el.count == 1
                                                        ? "text-[#facc15]"
                                                        : el.count == 2
                                                          ? "text-[#4f46e5]"
                                                          : ""
                                                    }`}
                                                  />
                                                ) : (
                                                  ""
                                                )}
                                              </div>
                                              <small className="flex items-center gap-1 font-semibold text-p-blue">
                                                {el.count == 2 && "2x"} +$
                                                {parseFloat(el.price).toFixed(
                                                  2,
                                                )}
                                              </small>
                                            </li>
                                          ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                                {/* extra topping end */}

                                <hr />
                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoPizza.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoTwoForOnePizza" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {item.twoForOnePizzaInfo.map(
                                  (pizzaObj, pizzaId) => (
                                    <>
                                      {/* header start */}
                                      <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                        <h4 className="font-semibold text-p-yellow">
                                          {pizzaId == 0
                                            ? "First Pizza "
                                            : "Second Pizza "}
                                          {pizzaObj.name}
                                        </h4>
                                        <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                          <small>2 FOR 1 PIZZA</small>
                                        </div>
                                      </div>
                                      {/* header end */}

                                      {pizzaId == 0 && (
                                        <>
                                          {/* pizza size start */}
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Pizza Size
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between w-full">
                                                <small className="font-semibold text-p-red">
                                                  {item.infoTwoForOnePizza[0].pizzaSize.value
                                                    .split(" ")
                                                    .map(
                                                      (el) =>
                                                        el[0].toUpperCase() +
                                                        el.slice(1),
                                                    )
                                                    .join(" ")}
                                                </small>

                                                <small className="font-semibold text-p-blue">
                                                  $
                                                  {parseFloat(
                                                    item.infoTwoForOnePizza[0]
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
                                        <h3 className="mb-2 font-bold text-p-blue">
                                          Existing Toppings Position
                                        </h3>
                                        <ul className="flex flex-col gap-2">
                                          {item.infoTwoForOnePizza[
                                            pizzaId
                                          ].existingTopPosition.map(
                                            (el, index) => (
                                              <li
                                                className="flex items-center gap-2"
                                                key={index}
                                              >
                                                <small className="font-semibold text-p-red">
                                                  {el.title.toUpperCase()}
                                                </small>
                                                {el.position == "middle" ? (
                                                  <MdCircle className="text-[25px] text-[#15803d]" />
                                                ) : el.position == "right" ? (
                                                  <PiCircleHalfFill className="text-[25px] text-[#15803d]" />
                                                ) : (
                                                  <PiCircleHalfFill className="rotate-[-180deg] text-[25px] text-[#15803d] " />
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
                                        <h3 className="mb-2 font-bold text-p-blue">
                                          Crust Option
                                        </h3>
                                        <ul>
                                          <li>
                                            <small className="font-semibold text-p-red">
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
                                        <h3 className="mb-2 font-bold text-p-blue">
                                          Cheese Option
                                        </h3>
                                        <ul>
                                          <li className="flex items-center justify-between">
                                            <small className="font-semibold text-p-red">
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
                                            <small className="font-semibold text-p-blue">
                                              {item.infoTwoForOnePizza[pizzaId]
                                                .cheeseOption ==
                                                "extra cheese" && "+$3.00"}
                                            </small>
                                          </li>
                                        </ul>
                                      </div>
                                      {/* cheese option end */}
                                      <hr />

                                      {pizzaId == 0 &&
                                      item.infoTwoForOnePizza[0].gluteen
                                        ?.option ? (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Add Gluteen Free
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {
                                                    item.infoTwoForOnePizza[0]
                                                      .gluteen?.title
                                                  }
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  +$3.00
                                                </small>
                                              </li>
                                            </ul>
                                          </div>
                                          {/* cheese option end */}
                                          <hr />
                                        </>
                                      ) : pizzaId == 1 &&
                                        item.infoTwoForOnePizza[1].gluteen
                                          ?.option ? (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Add Gluteen Free
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {
                                                    item.infoTwoForOnePizza[1]
                                                      .gluteen?.title
                                                  }
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  +$3.00
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

                                      {/* sauce option start */}
                                      <div className="">
                                        <h3 className="mb-2 font-bold text-p-blue">
                                          Choose Sauce
                                        </h3>
                                        <ul>
                                          <li>
                                            <small className="font-semibold text-p-red">
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
                                        .extraToppingOption.length != 0 && (
                                        <div className="">
                                          <h3 className="mb-2 font-bold text-p-blue">
                                            Extra Toppings Option
                                          </h3>
                                          <ul className="flex flex-col gap-2">
                                            {item.infoTwoForOnePizza[
                                              pizzaId
                                            ].extraToppingOption?.map(
                                              (el, index) =>
                                                el.count != 0 && (
                                                  <li
                                                    className="flex items-center justify-between"
                                                    key={index}
                                                  >
                                                    <div className="flex items-center gap-2 ">
                                                      <small className="font-semibold font text-p-red">
                                                        {el.title.toUpperCase()}
                                                      </small>
                                                      {el.position ==
                                                      "middle" ? (
                                                        <MdCircle
                                                          className={`text-[25px] ${
                                                            el.count == 1
                                                              ? "text-[#facc15]"
                                                              : el.count == 2
                                                                ? "text-[#4f46e5]"
                                                                : ""
                                                          }`}
                                                        />
                                                      ) : el.position ==
                                                        "right" ? (
                                                        <PiCircleHalfFill
                                                          className={`text-[25px] ${
                                                            el.count == 1
                                                              ? "text-[#facc15]"
                                                              : el.count == 2
                                                                ? "text-[#4f46e5]"
                                                                : ""
                                                          }`}
                                                        />
                                                      ) : el.position ==
                                                        "left" ? (
                                                        <PiCircleHalfFill
                                                          className={`rotate-[-180deg] text-[25px] ${
                                                            el.count == 1
                                                              ? "text-[#facc15]"
                                                              : el.count == 2
                                                                ? "text-[#4f46e5]"
                                                                : ""
                                                          }`}
                                                        />
                                                      ) : (
                                                        ""
                                                      )}
                                                    </div>
                                                    <small className="flex items-center gap-1 font-semibold text-p-blue">
                                                      {el.count == 2 && "2x"} +$
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

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {
                                      item.infoTwoForOnePizza[0]
                                        .specialInstrustions
                                    }
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoDonair" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.donairInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>DONAIR</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* sauce option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Choose Sauce
                                  </h3>
                                  <ul>
                                    {item.infoDonair.sauces.map((sauceName) => (
                                      <li>
                                        <small className="font-semibold text-p-red">
                                          {sauceName}
                                        </small>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {/* sauce option end */}
                                <hr />

                                {/* make combo start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Make Combo
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red">
                                        {item.infoDonair.makeCombo.comboName ==
                                        ""
                                          ? "Not"
                                          : item.infoDonair.makeCombo.comboName}
                                      </small>
                                      <small className="font-semibold text-p-blue">
                                        $
                                        {parseFloat(
                                          item.infoDonair.makeCombo.price,
                                        ).toFixed(2)}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* make combo end */}

                                <hr />

                                {/* drinks option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoDonair.drinks == ""
                                          ? "Not"
                                          : item.infoDonair.drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}

                                <hr />
                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoDonair.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoWings" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.infoWings.title}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>WINGS</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* tossed option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Tossed Options
                                  </h3>
                                  <ul>
                                    {item.infoWings.tossedOptions.map(
                                      (tossedName) => (
                                        <li>
                                          <small className="font-semibold text-p-red">
                                            {tossedName}
                                          </small>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                                {/* tossed option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoWings.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoPoutine" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.poutineInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>POUTINES</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* poutines size start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Poutines Size
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red">
                                        {item.infoPoutine.poutineSize.size}
                                      </small>
                                      <small className="font-semibold text-p-blue">
                                        +$
                                        {parseFloat(
                                          item.infoPoutine.poutineSize.price,
                                        ).toFixed(2)}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* poutines size end */}
                                <hr />

                                {item.infoPoutine.cheeseOption.find(
                                  (el) => el.cheeseName != "",
                                ) && (
                                  <>
                                    {/* extra cheese & meat option start */}
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Cheese & Meat Option
                                      </h3>
                                      <ul>
                                        {item.infoPoutine.cheeseOption?.map(
                                          (extraCheese) =>
                                            extraCheese.cheeseName != "" && (
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {extraCheese.cheeseName}
                                                </small>
                                                <small className="font-semibold text-p-blue">
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
                                    {/* extra cheese & meat option end */}
                                    <hr />
                                  </>
                                )}

                                {item.infoPoutine.extraAddedTopping.length !=
                                  0 && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Added Toppings
                                      </h3>
                                      <ul>
                                        {item.infoPoutine.extraAddedTopping?.map(
                                          (el) => (
                                            <li className="flex items-center justify-between">
                                              <small className="font-semibold text-p-red">
                                                {el}
                                              </small>
                                              <small className="font-semibold text-p-blue">
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

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoPoutine.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoChicken" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.infoChicken.title}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>CHICKEN</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {item.infoChicken.combo != "" && (
                                  <>
                                    {/* comes with options start */}
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Comes with options
                                      </h3>
                                      <ul>
                                        <li>
                                          <small className="font-semibold text-p-red">
                                            {item.infoChicken.combo}
                                          </small>
                                        </li>
                                      </ul>
                                    </div>
                                    {/* comes with options end */}
                                    <hr />
                                  </>
                                )}

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoChicken.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoPanza" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.infoPanza.title}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>PANZAROTTI</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* sauce option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Default Toppings
                                  </h3>
                                  <ul>
                                    {item.infoPanza.defaultTopping.map((el) => (
                                      <li>
                                        <small className="font-semibold text-p-red">
                                          {el == "SHRIMP" ||
                                          el == "CRAB" ||
                                          el == "CHICKEN" ||
                                          el == "DONAIR MEAT"
                                            ? `${el} 2x`
                                            : el}
                                        </small>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {/* sauce option end */}
                                <hr />

                                {item.infoPanza.extraTopping.length != 0 && (
                                  <>
                                    {/* extra toppings start */}
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Toppings
                                      </h3>
                                      <ul>
                                        {item.infoPanza.extraTopping.map(
                                          (el) => (
                                            <li className="flex items-center justify-between">
                                              <small className="font-semibold text-p-red">
                                                {el.title == "SHRIMP" ||
                                                el.title == "CRAB" ||
                                                el.title == "CHICKEN" ||
                                                el.title == "DONAIR MEAT"
                                                  ? `${el.title} 2x`
                                                  : el.title}
                                              </small>
                                              <small className="font-semibold text-p-blue">
                                                +$
                                                {parseFloat(el.price).toFixed(
                                                  2,
                                                )}
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

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoPanza.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoGarlic" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    Garlic Fingers
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>GARLIC FINGERS</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* garlic fingers size start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Garlic Fingers Size
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red">
                                        {item.infoGarlic.garlicOption.name}
                                      </small>
                                      <small className="font-semibold text-p-blue">
                                        +$
                                        {parseFloat(
                                          item.infoGarlic.garlicOption.price,
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
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Option
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {item.infoGarlic.bacon.value}
                                          </small>
                                          <small className="font-semibold text-p-blue">
                                            +$
                                            {parseFloat(
                                              item.infoGarlic.bacon.price,
                                            ).toFixed(2)}
                                          </small>
                                        </li>
                                      </ul>
                                    </div>
                                    {/* extra option size end */}
                                    <hr />
                                  </>
                                )}

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoGarlic.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoBurger" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.burgerInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>BURGERS</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {item.infoBurger.extraPatty && (
                                  <>
                                    {/* extra patty option start */}
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Patty Option
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            Add extra one patty
                                          </small>
                                          <small className="font-semibold text-p-blue">
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
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Make Combo
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {
                                              item.infoBurger.makeCombo
                                                .comboName
                                            }
                                          </small>
                                          <small className="font-semibold text-p-blue">
                                            +$
                                            {parseFloat(
                                              item.infoBurger.makeCombo.price,
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
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Drinks
                                      </h3>
                                      <ul>
                                        <li>
                                          <small className="font-semibold text-p-red">
                                            {item.infoBurger.drinks}
                                          </small>
                                        </li>
                                      </ul>
                                    </div>
                                    {/* sauce option end */}
                                    <hr />
                                  </>
                                )}

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoBurger.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSalad" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.saladInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>SALADS</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {"saladSize" in item.infoSalad && (
                                  <>
                                    {/* salad size start */}
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Salad Size
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {item.infoSalad.saladSize.name}
                                          </small>
                                          <small className="font-semibold text-p-blue">
                                            +$
                                            {parseFloat(
                                              item.infoSalad.saladSize.price,
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
                                  item.saladInfo.name == "Donair Salad" && (
                                    <>
                                      {/* choose sauce start */}
                                      <div className="">
                                        <h3 className="mb-2 font-bold text-p-blue">
                                          Choose Sauce
                                        </h3>
                                        <ul>
                                          <li>
                                            <small className="font-semibold text-p-red">
                                              {item.infoSalad.chooseSauce}
                                            </small>
                                          </li>
                                        </ul>
                                      </div>
                                      {/* choose sauce end */}
                                      <hr />
                                    </>
                                  )}

                                {(item.infoSalad.extraOption[0].extraName !=
                                  "" ||
                                  item.infoSalad.extraOption[1].extraName !=
                                    "") && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Cheese & Meat Option
                                      </h3>
                                      <ul>
                                        {item.infoSalad.extraOption.map(
                                          (el) =>
                                            el.extraName != "" && (
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {el.extraName}
                                                </small>
                                                <small className="font-semibold text-p-blue">
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

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoSalad.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoPasta" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.pastaInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>SPECIALITY PASTA</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* pasta size start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Pasta Size
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red">
                                        {item.infoPasta.pastaSize.size}
                                      </small>
                                      <small className="font-semibold text-p-blue">
                                        $
                                        {parseFloat(
                                          item.infoPasta.pastaSize.price,
                                        ).toFixed(2)}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* pasta size end */}
                                <hr />

                                {item.infoPasta.extraOption
                                  .map((el) => (el.optionCheck ? true : false))
                                  .includes(true) && (
                                  <>
                                    {/* extra add options start */}
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Add Options
                                      </h3>
                                      <ul>
                                        {item.infoPasta.extraOption.map(
                                          (el) =>
                                            el.optionName != "" && (
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {el.title}
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  {el.optionQuantity > 1 &&
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

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoPasta.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSub" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.subInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
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
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Choose Sauce
                                      </h3>
                                      <ul>
                                        {item.infoSub.chooseSauce.map(
                                          (el) =>
                                            el.sauceName != "" && (
                                              <li>
                                                <small className="font-semibold text-p-red">
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

                                {(item.infoSub.cheeseOption[0].extraName !=
                                  "" ||
                                  item.infoSub.cheeseOption[1].extraName !=
                                    "") && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Cheese & Meat Option
                                      </h3>
                                      <ul>
                                        {item.infoSub.cheeseOption.map(
                                          (el) =>
                                            el.extraName != "" && (
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {el.extraName}
                                                </small>
                                                <small className="font-semibold text-p-blue">
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

                                {item.infoSub.extraAddedTopping.length != 0 && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Extra Added Toppings
                                      </h3>
                                      <ul>
                                        {item.infoSub.extraAddedTopping?.map(
                                          (el) => (
                                            <li className="flex items-center justify-between">
                                              <small className="font-semibold text-p-red">
                                                {el}
                                              </small>
                                              <small className="font-semibold text-p-blue">
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

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoSub.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoCan" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    Can of Pop
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>BEVERAGES</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* drinks option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoCan.drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoMlPop" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    710ml Pop
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>BEVERAGES</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* drinks option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoMlPop.drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoLitre" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    2L
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>BEVERAGES</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* drinks option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoLitre.drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoWater" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    Water
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>BEVERAGES</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* drinks option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        Water
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSauce" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.sauceInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>SAUCE</small>
                                  </div>
                                </div>
                                {/* header end */}

                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}

                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoSauce.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSides" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.sidesInfo.name}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>SIDES</small>
                                  </div>
                                </div>
                                {/* header end */}

                                <hr />

                                {/* Side size start */}

                                {typeof item.sidesInfo.prices === "object" &&
                                  item.sidesInfo.prices.hasOwnProperty(
                                    "medium",
                                  ) && (
                                    <>
                                      <div className="">
                                        <h3 className="mb-2 font-bold text-p-blue">
                                          Sides Size
                                        </h3>
                                        <ul>
                                          <li className="flex items-center justify-between w-full">
                                            <small className="font-semibold text-p-red">
                                              {item.infoSides.sideSize
                                                .split(" ")
                                                .map(
                                                  (el) =>
                                                    el[0].toUpperCase() +
                                                    el.slice(1),
                                                )
                                                .join(" ")}
                                            </small>

                                            <small className="font-semibold text-p-blue">
                                              $
                                              {parseFloat(
                                                item.infoSides.sidePrice,
                                              ).toFixed(2)}
                                            </small>
                                          </li>
                                        </ul>
                                      </div>
                                      <hr />
                                    </>
                                  )}
                                {/* Side size end */}

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoSides.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSpecialOne" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {item.infoSpecialOne.map(
                                  (pizzaObj, pizzaId) => (
                                    <>
                                      {/* header start */}

                                      {pizzaId == 0 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            First Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 1</small>
                                          </div>
                                        </div>
                                      ) : pizzaId == 1 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            Second Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 1</small>
                                          </div>
                                        </div>
                                      ) : pizzaId == 2 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            Third Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Default Toppings
                                            </h3>
                                            <ul>
                                              {pizzaObj.defaultTopping?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Crust Option
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Cheese Option
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {pizzaObj?.cheeseOption
                                                    .split(" ")
                                                    .map(
                                                      (el) =>
                                                        el[0].toUpperCase() +
                                                        el.slice(1),
                                                    )
                                                    .join(" ")}
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  {pizzaObj?.cheeseOption ==
                                                    "extra cheese" && "+$3.00"}
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
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Choose Sauce
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                        pizzaObj?.extraToppingOption.length !=
                                          0 && (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                    </>
                                  ),
                                )}

                                {/* drinks option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialOne[3].drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSpecialTwo" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {item.infoSpecialTwo.map(
                                  (pizzaObj, pizzaId) => (
                                    <>
                                      {/* header start */}

                                      {pizzaId == 0 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            First Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 2</small>
                                          </div>
                                        </div>
                                      ) : pizzaId == 1 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            Second Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 2</small>
                                          </div>
                                        </div>
                                      ) : pizzaId == 2 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            Third Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Default Toppings
                                            </h3>
                                            <ul>
                                              {pizzaObj.defaultTopping?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Crust Option
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Cheese Option
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {pizzaObj?.cheeseOption
                                                    .split(" ")
                                                    .map(
                                                      (el) =>
                                                        el[0].toUpperCase() +
                                                        el.slice(1),
                                                    )
                                                    .join(" ")}
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  {pizzaObj?.cheeseOption ==
                                                    "extra cheese" && "+$3.00"}
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
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Choose Sauce
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                        pizzaObj?.extraToppingOption.length !=
                                          0 && (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
                                                          {el.count == 2 &&
                                                            "2x"}
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialTwo[3].drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}

                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSpecialThree" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {item.infoSpecialThree.map(
                                  (pizzaObj, pizzaId) => (
                                    <>
                                      {/* header start */}
                                      {pizzaId == 0 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            First Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 3</small>
                                          </div>
                                        </div>
                                      ) : pizzaId == 1 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            Second Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 3</small>
                                          </div>
                                        </div>
                                      ) : (
                                        ""
                                      )}
                                      {/* header end */}

                                      {/* Default Toppings start */}

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Default Toppings
                                            </h3>
                                            <ul>
                                              {pizzaObj.defaultTopping?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
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

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          {/* crust option start */}
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Crust Option
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Cheese Option
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {pizzaObj?.cheeseOption
                                                    .split(" ")
                                                    .map(
                                                      (el) =>
                                                        el[0].toUpperCase() +
                                                        el.slice(1),
                                                    )
                                                    .join(" ")}
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  {pizzaObj?.cheeseOption ==
                                                    "extra cheese" && "+$3.00"}
                                                </small>
                                              </li>
                                            </ul>
                                          </div>

                                          <hr />
                                        </>
                                      )}

                                      {(pizzaId == 0 || pizzaId == 1) &&
                                        pizzaObj.gluteen.option && (
                                          <>
                                            {/* cheese option start */}
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* cheese option end */}
                                            <hr />
                                          </>
                                        )}

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Choose Sauce
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                        pizzaObj?.extraToppingOption.length !=
                                          0 && (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                    </>
                                  ),
                                )}

                                {/* Tossed option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Tossed Options
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialThree[2].tossedOption}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* Tossed option end */}
                                <hr />

                                {/* Tossed option start */}
                                {item.infoSpecialThree[2].boneless != "" && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Boneless Options
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {item.infoSpecialThree[2].boneless}
                                          </small>
                                          <small className="font-semibold text-p-blue">
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialThree[3].drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSpecialFour" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {item.infoSpecialFour.map(
                                  (pizzaObj, pizzaId) => (
                                    <>
                                      {/* header start */}
                                      {pizzaId == 0 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            First Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 4</small>
                                          </div>
                                        </div>
                                      ) : pizzaId == 1 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            Second Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                            <small>SPECIAL 4</small>
                                          </div>
                                        </div>
                                      ) : (
                                        ""
                                      )}
                                      {/* header end */}

                                      {/* Default Toppings start */}

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Default Toppings
                                            </h3>
                                            <ul>
                                              {pizzaObj.defaultTopping?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
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

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          {/* crust option start */}
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Crust Option
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Cheese Option
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {pizzaObj?.cheeseOption
                                                    .split(" ")
                                                    .map(
                                                      (el) =>
                                                        el[0].toUpperCase() +
                                                        el.slice(1),
                                                    )
                                                    .join(" ")}
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  {pizzaObj?.cheeseOption ==
                                                    "extra cheese" && "+$3.00"}
                                                </small>
                                              </li>
                                            </ul>
                                          </div>

                                          <hr />
                                        </>
                                      )}

                                      {(pizzaId == 0 || pizzaId == 1) &&
                                        pizzaObj.gluteen.option && (
                                          <>
                                            {/* cheese option start */}
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* cheese option end */}
                                            <hr />
                                          </>
                                        )}

                                      {(pizzaId == 0 || pizzaId == 1) && (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Choose Sauce
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                        pizzaObj?.extraToppingOption.length !=
                                          0 && (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                    </>
                                  ),
                                )}

                                {/* Tossed option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Tossed Options
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialFour[2].tossedOption}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* Tossed option end */}
                                <hr />

                                {/* Tossed option start */}
                                {item.infoSpecialFour[2].boneless != "" && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Boneless Options
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {item.infoSpecialFour[2].boneless}
                                          </small>
                                          <small className="font-semibold text-p-blue">
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialFour[3].drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSpecialFive" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {item.infoSpecialFive.map(
                                  (pizzaObj, pizzaId) => (
                                    <>
                                      {/* header start */}
                                      {pizzaId == 0 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            First Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Default Toppings
                                            </h3>
                                            <ul>
                                              {pizzaObj.defaultTopping?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Crust Option
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Cheese Option
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {pizzaObj?.cheeseOption
                                                    .split(" ")
                                                    .map(
                                                      (el) =>
                                                        el[0].toUpperCase() +
                                                        el.slice(1),
                                                    )
                                                    .join(" ")}
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  {pizzaObj?.cheeseOption ==
                                                    "extra cheese" && "+$3.00"}
                                                </small>
                                              </li>
                                            </ul>
                                          </div>

                                          <hr />
                                        </>
                                      )}

                                      {pizzaId == 0 &&
                                        pizzaObj.gluteen.option && (
                                          <>
                                            {/* cheese option start */}
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
                                                    +$3.00
                                                  </small>
                                                </li>
                                              </ul>
                                            </div>
                                            {/* cheese option end */}
                                            <hr />
                                          </>
                                        )}

                                      {pizzaId == 0 && (
                                        <>
                                          <div className="">
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Choose Sauce
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                        pizzaObj?.extraToppingOption.length !=
                                          0 && (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
                                                          {el.count == 2 &&
                                                            "2x"}
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Tossed Options
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialFive[1].tossedOption}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* Tossed option end */}
                                <hr />

                                {/* Tossed option start */}
                                {item.infoSpecialFive[2].boneless != "" && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Boneless Options
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {item.infoSpecialFive[1].boneless}
                                          </small>
                                          <small className="font-semibold text-p-blue">
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialFive[2].drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoSpecialSix" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {item.infoSpecialSix.map(
                                  (pizzaObj, pizzaId) => (
                                    <>
                                      {/* header start */}
                                      {pizzaId == 0 ? (
                                        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                          <h4 className="font-semibold text-p-yellow">
                                            First Pizza
                                          </h4>
                                          <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Default Toppings
                                            </h3>
                                            <ul>
                                              {pizzaObj.defaultTopping?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Crust Option
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Cheese Option
                                            </h3>
                                            <ul>
                                              <li className="flex items-center justify-between">
                                                <small className="font-semibold text-p-red">
                                                  {pizzaObj?.cheeseOption
                                                    .split(" ")
                                                    .map(
                                                      (el) =>
                                                        el[0].toUpperCase() +
                                                        el.slice(1),
                                                    )
                                                    .join(" ")}
                                                </small>
                                                <small className="font-semibold text-p-blue">
                                                  {pizzaObj?.cheeseOption ==
                                                    "extra cheese" && "+$3.00"}
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Choose Sauce
                                            </h3>
                                            <ul>
                                              <li>
                                                <small className="font-semibold text-p-red">
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
                                        pizzaObj?.extraToppingOption.length !=
                                          0 && (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
                                                          {el.count == 2 &&
                                                            "2x"}
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Donair Toppings
                                            </h3>
                                            <ul>
                                              {pizzaObj.donairTopping?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
                                                      {el.checked && el.title}
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
                                            <h3 className="mb-2 font-bold text-p-blue">
                                              Donair Sauce
                                            </h3>
                                            <ul>
                                              {pizzaObj.donairSauce?.map(
                                                (el) => (
                                                  <li>
                                                    <small className="font-semibold text-p-red">
                                                      {el.checked && el.title}
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Tossed Options
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialSix[1].tossedOption}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* Tossed option end */}
                                <hr />

                                {/* Tossed option start */}
                                {item.infoSpecialSix[2].boneless != "" && (
                                  <>
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Boneless Options
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {item.infoSpecialSix[1].boneless}
                                          </small>
                                          <small className="font-semibold text-p-blue">
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Drinks
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoSpecialSix[2].drinks}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* drinks option end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoWalkIn" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    Walk-In Special
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>WALK-IN SPECIAL ONLY</small>
                                  </div>
                                </div>
                                {/* header end */}

                                {/* comes with options start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Walk-in Specials
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoWalkIn.walkIn}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* comes with options end */}
                                <hr />

                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoCustomSingle" in item ? (
                        <div className="w-full p-1 mb-1">
                          <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                            <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                              <div className="flex flex-col w-full gap-5">
                                {/* header start */}
                                <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                  <h4 className="font-semibold text-p-yellow">
                                    {item.customSingleInfo.title}
                                  </h4>
                                  <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                    <small>OWN PIZZA</small>
                                  </div>
                                </div>
                                {/* header end */}
                                {/* pizza size start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Pizza Size
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between w-full">
                                      <small className="font-semibold text-p-red">
                                        {item.infoCustomSingle.pizzaSize
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
                                          )
                                          .join(" ")}
                                      </small>

                                      <small className="font-semibold text-p-blue">
                                        $
                                        {parseFloat(
                                          item.infoCustomSingle.pizzaSizeData,
                                        ).toFixed(2)}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* pizza size end */}
                                <hr />

                                {/* extra topping start */}
                                {item.infoCustomSingle.extraToppingOption
                                  .length != 0 && (
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Default Toppings
                                    </h3>
                                    <ul className="flex flex-col gap-2">
                                      {item.infoCustomSingle.extraToppingOption?.map(
                                        (el, index) =>
                                          el.count != 0 && (
                                            <li
                                              className="flex items-center justify-between"
                                              key={index}
                                            >
                                              <div className="flex items-center gap-2 ">
                                                <small className="font-semibold font text-p-red">
                                                  {el.title.toUpperCase()}
                                                </small>
                                                {el.position == "middle" ? (
                                                  <MdCircle
                                                    className={`text-[25px] ${
                                                      el.count == 1
                                                        ? "text-[#facc15]"
                                                        : el.count == 2
                                                          ? "text-[#4f46e5]"
                                                          : ""
                                                    }`}
                                                  />
                                                ) : el.position == "right" ? (
                                                  <PiCircleHalfFill
                                                    className={`text-[25px] ${
                                                      el.count == 1
                                                        ? "text-[#facc15]"
                                                        : el.count == 2
                                                          ? "text-[#4f46e5]"
                                                          : ""
                                                    }`}
                                                  />
                                                ) : el.position == "left" ? (
                                                  <PiCircleHalfFill
                                                    className={`rotate-[-180deg] text-[25px] ${
                                                      el.count == 1
                                                        ? "text-[#facc15]"
                                                        : el.count == 2
                                                          ? "text-[#4f46e5]"
                                                          : ""
                                                    }`}
                                                  />
                                                ) : (
                                                  ""
                                                )}
                                              </div>
                                              <small className="flex items-center gap-1 font-semibold text-p-blue">
                                                {el.count == 2 && "2x"} +$
                                                {parseFloat(el.price).toFixed(
                                                  2,
                                                )}
                                              </small>
                                            </li>
                                          ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                                {/* extra topping end */}
                                <hr />

                                {/* crust option start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Crust Option
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoCustomSingle.crustOption
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Cheese Option
                                  </h3>
                                  <ul>
                                    <li className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red">
                                        {item.infoCustomSingle.cheeseOption
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
                                          )
                                          .join(" ")}
                                      </small>
                                      <small className="font-semibold text-p-blue">
                                        {item.infoCustomSingle.cheeseOption ==
                                          "extra cheese" && "+$3.00"}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* cheese option end */}
                                <hr />

                                {item.infoCustomSingle.gluteen.option && (
                                  <>
                                    {/* cheese option start */}
                                    <div className="">
                                      <h3 className="mb-2 font-bold text-p-blue">
                                        Add Gluteen Free
                                      </h3>
                                      <ul>
                                        <li className="flex items-center justify-between">
                                          <small className="font-semibold text-p-red">
                                            {
                                              item.infoCustomSingle.gluteen
                                                .title
                                            }
                                          </small>
                                          <small className="font-semibold text-p-blue">
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
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Choose Sauce
                                  </h3>
                                  <ul>
                                    <li>
                                      <small className="font-semibold text-p-red">
                                        {item.infoCustomSingle.sauce
                                          .split(" ")
                                          .map(
                                            (el) =>
                                              el[0].toUpperCase() + el.slice(1),
                                          )
                                          .join(" ")}
                                      </small>
                                    </li>
                                  </ul>
                                </div>
                                {/* sauce option end */}

                                <hr />
                                {/* total qty start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Total Qty
                                  </h3>
                                  <div className="flex items-center justify-between">
                                    <small className="font-semibold text-p-red ">
                                      Qty
                                    </small>
                                    <small className="font-semibold text-p-blue ">
                                      {item.quantity} pcs
                                    </small>
                                  </div>
                                </div>
                                {/* total qty end */}
                                <hr />
                                {/* special instruction start */}
                                <div className="">
                                  <h3 className="mb-2 font-bold text-p-blue">
                                    Special Instruction
                                  </h3>
                                  <div className="flex items-center text-p-red text-[12px] justify-between">
                                    {item.infoCustomSingle.specialInstrustions}
                                  </div>
                                </div>
                                {/* special instruction start */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : "infoCustomTwoForOne" in item ? (
                        <>
                          <div className="w-full p-1 mb-1">
                            <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                              <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                                <div className="flex flex-col w-full gap-5">
                                  {item.infoCustomTwoForOne.map(
                                    (pizzaObj, pizzaId) => (
                                      <>
                                        {/* header start */}

                                        {pizzaId == 0 ? (
                                          <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                            <h4 className="font-semibold text-p-yellow">
                                              First Pizza
                                            </h4>
                                            <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                              <small>
                                                CUSTOM 2 FOR 1 PIZZA
                                              </small>
                                            </div>
                                          </div>
                                        ) : pizzaId == 1 ? (
                                          <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                            <h4 className="font-semibold text-p-yellow">
                                              Second Pizza
                                            </h4>
                                            <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Pizza Size
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between w-full">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.pizzaSize
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>

                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Default Toppings
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                        ) : pizzaId == 1 ? (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Default Toppings
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                        ) : (
                                          ""
                                        )}

                                        {pizzaId == 0 ? (
                                          <>
                                            {/* crust option start */}
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Crust Option
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Crust Option
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Cheese Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.cheeseOption
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Cheese Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.cheeseOption
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Choose Sauce
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Choose Sauce
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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

                                  {/* total qty start */}
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Total Qty
                                    </h3>
                                    <div className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red ">
                                        Qty
                                      </small>
                                      <small className="font-semibold text-p-blue ">
                                        {item.quantity} pcs
                                      </small>
                                    </div>
                                  </div>
                                  {/* total qty end */}

                                  <hr />

                                  {/* special instruction start */}
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Special Instruction
                                    </h3>
                                    <div className="flex items-center text-p-red text-[12px] justify-between">
                                      {
                                        item.infoCustomTwoForOne[1]
                                          .specialInstrustions
                                      }
                                    </div>
                                  </div>
                                  {/* special instruction start */}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : "infoCustomTwoTopping" in item ? (
                        <>
                          <div className="w-full p-1 mb-1">
                            <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                              <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                                <div className="flex flex-col w-full gap-5">
                                  {item.infoCustomTwoTopping.map(
                                    (pizzaObj, pizzaId) => (
                                      <>
                                        {/* header start */}

                                        {pizzaId == 0 ? (
                                          <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                            <h4 className="font-semibold text-p-yellow">
                                              First Pizza
                                            </h4>
                                            <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                              <small>
                                                CUSTOM 2 FOR 1 TWO TOPPING
                                              </small>
                                            </div>
                                          </div>
                                        ) : pizzaId == 1 ? (
                                          <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                            <h4 className="font-semibold text-p-yellow">
                                              Second Pizza
                                            </h4>
                                            <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Pizza Size
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between w-full">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.pizzaSize
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>

                                                  <small className="font-semibold text-p-blue">
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
                                            {pizzaObj.defaultTopping.length !==
                                              0 && (
                                              <>
                                                <div className="">
                                                  <h3 className="mb-2 font-bold text-p-blue">
                                                    Default Toppings
                                                  </h3>
                                                  <ul>
                                                    {pizzaObj.defaultTopping.map(
                                                      (el) => (
                                                        <li>
                                                          <small className="font-semibold text-p-red">
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
                                            {pizzaObj.defaultTopping.length !==
                                              0 && (
                                              <>
                                                <div className="">
                                                  <h3 className="mb-2 font-bold text-p-blue">
                                                    Default Toppings
                                                  </h3>
                                                  <ul>
                                                    {pizzaObj.defaultTopping.map(
                                                      (el) => (
                                                        <li>
                                                          <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                        ) : pizzaId == 1 ? (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                        ) : (
                                          ""
                                        )}

                                        {pizzaId == 0 ? (
                                          <>
                                            {/* crust option start */}
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Crust Option
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Crust Option
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Cheese Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.cheeseOption
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Cheese Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.cheeseOption
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Choose Sauce
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Choose Sauce
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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

                                  {/* total qty start */}
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Total Qty
                                    </h3>
                                    <div className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red ">
                                        Qty
                                      </small>
                                      <small className="font-semibold text-p-blue ">
                                        {item.quantity} pcs
                                      </small>
                                    </div>
                                  </div>
                                  {/* total qty end */}

                                  <hr />
                                  {/* special instruction start */}
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Special Instruction
                                    </h3>
                                    <div className="flex items-center text-p-red text-[12px] justify-between">
                                      {
                                        item.infoCustomTwoTopping[1]
                                          .specialInstrustions
                                      }
                                    </div>
                                  </div>
                                  {/* special instruction start */}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : "infoCustomThreeTopping" in item ? (
                        <>
                          <div className="w-full p-1 mb-1">
                            <div className="flex flex-col-reverse justify-end w-full h-full gap-3">
                              <div className="flex items-center p-3 bg-white rounded-lg shadow-lg">
                                <div className="flex flex-col w-full gap-5">
                                  {item.infoCustomThreeTopping.map(
                                    (pizzaObj, pizzaId) => (
                                      <>
                                        {/* header start */}

                                        {pizzaId == 0 ? (
                                          <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                            <h4 className="font-semibold text-p-yellow">
                                              First Pizza
                                            </h4>
                                            <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                              <small>
                                                CUSTOM 2 FOR 1 THREE TOPPING
                                              </small>
                                            </div>
                                          </div>
                                        ) : pizzaId == 1 ? (
                                          <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-p-red">
                                            <h4 className="font-semibold text-p-yellow">
                                              Second Pizza
                                            </h4>
                                            <div className="p-1 font-semibold bg-white rounded-sm text-p-blue">
                                              <small>
                                                CUSTOM 2 FOR 1 THREE TOPPING
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Pizza Size
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between w-full">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.pizzaSize
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>

                                                  <small className="font-semibold text-p-blue">
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
                                            {pizzaObj.defaultTopping.length !==
                                              0 && (
                                              <>
                                                <div className="">
                                                  <h3 className="mb-2 font-bold text-p-blue">
                                                    Default Toppings
                                                  </h3>
                                                  <ul>
                                                    {pizzaObj.defaultTopping.map(
                                                      (el) => (
                                                        <li>
                                                          <small className="font-semibold text-p-red">
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
                                            {pizzaObj.defaultTopping.length !==
                                              0 && (
                                              <>
                                                <div className="">
                                                  <h3 className="mb-2 font-bold text-p-blue">
                                                    Default Toppings
                                                  </h3>
                                                  <ul>
                                                    {pizzaObj.defaultTopping.map(
                                                      (el) => (
                                                        <li>
                                                          <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                        ) : pizzaId == 1 ? (
                                          <>
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Extra Toppings Option
                                              </h3>
                                              <ul className="flex flex-col gap-2">
                                                {pizzaObj.extraToppingOption?.map(
                                                  (el, index) =>
                                                    el.count != 0 && (
                                                      <li
                                                        className="flex items-center justify-between"
                                                        key={index}
                                                      >
                                                        <div className="flex items-center gap-2 ">
                                                          <small className="font-semibold font text-p-red">
                                                            {el.title.toUpperCase()}
                                                          </small>
                                                          {el.position ==
                                                          "middle" ? (
                                                            <MdCircle
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "right" ? (
                                                            <PiCircleHalfFill
                                                              className={`text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
                                                                  : el.count ==
                                                                      2
                                                                    ? "text-[#4f46e5]"
                                                                    : ""
                                                              }`}
                                                            />
                                                          ) : el.position ==
                                                            "left" ? (
                                                            <PiCircleHalfFill
                                                              className={`rotate-[-180deg] text-[25px] ${
                                                                el.count == 1
                                                                  ? "text-[#facc15]"
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
                                                        <small className="flex items-center gap-1 font-semibold text-p-blue">
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
                                        ) : (
                                          ""
                                        )}

                                        {pizzaId == 0 ? (
                                          <>
                                            {/* crust option start */}
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Crust Option
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Crust Option
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Cheese Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.cheeseOption
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Cheese Option
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.cheeseOption
                                                      .split(" ")
                                                      .map(
                                                        (el) =>
                                                          el[0].toUpperCase() +
                                                          el.slice(1),
                                                      )
                                                      .join(" ")}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Add Gluteen Free
                                              </h3>
                                              <ul>
                                                <li className="flex items-center justify-between">
                                                  <small className="font-semibold text-p-red">
                                                    {pizzaObj.gluteen.title}
                                                  </small>
                                                  <small className="font-semibold text-p-blue">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Choose Sauce
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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
                                            <div className="">
                                              <h3 className="mb-2 font-bold text-p-blue">
                                                Choose Sauce
                                              </h3>
                                              <ul>
                                                <li>
                                                  <small className="font-semibold text-p-red">
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

                                  {/* total qty start */}
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Total Qty
                                    </h3>
                                    <div className="flex items-center justify-between">
                                      <small className="font-semibold text-p-red ">
                                        Qty
                                      </small>
                                      <small className="font-semibold text-p-blue ">
                                        {item.quantity} pcs
                                      </small>
                                    </div>
                                  </div>
                                  {/* total qty end */}

                                  <hr />
                                  {/* special instruction start */}
                                  <div className="">
                                    <h3 className="mb-2 font-bold text-p-blue">
                                      Special Instruction
                                    </h3>
                                    <div className="flex items-center text-p-red text-[12px] justify-between">
                                      {
                                        item.infoCustomThreeTopping[1]
                                          .specialInstrustions
                                      }
                                    </div>
                                  </div>
                                  {/* special instruction start */}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        ""
                      )}
                    </>
                  ))}
                  {/* rest of your ordered product loop start */}
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
