"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import apiUrl from "@/app/_host/apiURL";


const page = () => {
  let data = useSelector((state) => state.userData.userInfo);
  let initialValue = 0;
  const [nowPending, setNowPending] = useState([]);
  const [laterPending, setLaterPending] = useState([]);
  const [acceptOrder, setAcceptOrder] = useState([]);
  const [rejectOrder, setRejectOrder] = useState([]);
  const [allUser, setAllUser] = useState([]);
  const [blockUser, setBlockUser] = useState([]);

  useEffect(() => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/dashboard/now-pending-order/${data?.branchName}`,
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          setNowPending(response.data.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  useEffect(() => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/dashboard/later-pending-order/${data?.branchName}`,
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          setLaterPending(response.data.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  useEffect(() => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/dashboard/accept-order/${data?.branchName}`,
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          setAcceptOrder(response.data.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  useEffect(() => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/dashboard/reject-order/${data?.branchName}`,
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          setRejectOrder(response.data.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  useEffect(() => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/dashboard/alluser`,
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          setAllUser(response.data.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  useEffect(() => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${apiUrl}/api/v1/dashboard/blockuser`,
    };

    axios
      .request(config)
      .then((response) => {
        if ("data" in response.data) {
          setBlockUser(response.data.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <div className="w-full dashboard-head">
      <div className="pt-[80px] p-[10px] w-full">
        <h1 className="mt-5 text-3xl font-bold text-center text-p-red">
          Welcome to Dashboard
        </h1>
      </div>

      <div className="dashboard-content p-[15px] mt-[50px]">
        <div className="flex flex-wrap justify-center w-full gap-4 content-inner col lg:row">
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Pending Orders(now)
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {nowPending.length}
            </h3>
          </div>
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Pending Orders(later)
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {laterPending.length}
            </h3>
          </div>
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Total Accepted Orders
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {acceptOrder.length}
            </h3>
          </div>
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Total Rejected Orders
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {rejectOrder.length}
            </h3>
          </div>
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Total Users
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {allUser.length}
            </h3>
          </div>
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Total Earnings
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {acceptOrder.length >= 1
                ? `$${parseFloat(
                    acceptOrder.reduce(
                      (accumulator, currentValue) =>
                        accumulator +
                        Number(currentValue.orderPrice.split("$")[1]),
                      initialValue,
                    ) -
                      acceptOrder.reduce(
                        (accumulator, currentValue) =>
                          accumulator +
                          Number(currentValue.orderPriceTax.split("$")[1]),
                        initialValue,
                      ),
                  ).toFixed(2)}`
                : "$00.00"}
            </h3>
          </div>
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Total Tax
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {acceptOrder.length >= 1
                ? `$${parseFloat(
                    acceptOrder.reduce(
                      (accumulator, currentValue) =>
                        accumulator +
                        Number(currentValue.orderPriceTax.split("$")[1]),
                      initialValue,
                    ),
                  ).toFixed(2)}`
                : "$00.00"}
            </h3>
          </div>
          <div className="flex flex-col justity-center items-center p-3 w-full lg:w-[23%] shadow-lg py-[25px] rounded-lg">
            <h2 className="font-bold text-[20px] text-p-red text-center">
              Total Blocked Users
            </h2>
            <h3 className="font-bold text-[50px] text-p-blue">
              {blockUser.length}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
