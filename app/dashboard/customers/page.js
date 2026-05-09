"use client";

import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { LiaSearchSolid } from "react-icons/lia";
import axios from "axios";
import apiUrl from "@/app/_host/apiURL";


const page = () => {
  const [allUser, setAllUser] = useState([]);

  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/auth/allusers`)
      .then((res) => setAllUser(res.data));
  }, []);

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

  //   user block unblock
  let userBlock = (_id) => {
    axios
      .post(`${apiUrl}/api/v1/auth/userblocking`, {
        id: _id,
        blocking: "block",
      })
      .then((res) => {
        toast.success(res.data.message);
        location.reload();
      });
  };
  let userUnBlock = (_id) => {
    axios
      .post(`${apiUrl}/api/v1/auth/userblocking`, {
        id: _id,
        blocking: "unblock",
      })
      .then((res) => {
        toast.success(res.data.message);
        location.reload();
      });
  };
  //   user delete
  let deleteUser = (_id) => {
    axios
      .post(`${apiUrl}/api/v1/auth/deleteuser`, {
        id: _id,
      })
      .then((res) => {
        toast.success(res.data.message);
        location.reload();
      });
  };

  return (
    <div className="pt-[80px] p-[10px] w-full">
      <div className="customerOrder-head">
        <h2 className="mt-5 text-3xl font-bold text-center text-p-red">
          Customers
        </h2>
      </div>

      <div className="w-full customer-search mt-[40px] pb-[30px] flex justify-end items-center">
        <div className="search-main">
          <h2 className="font-bold text-[20px] text-p-red mb-[20px]">
            Find Customer By Name
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

      <div className="w-full pendingOrder-main">
        <div className="pendingOrder-inner flex flex-col flex-col-reverse flex-wrap gap-[50px] justify-center items-center">
          {allUser?.map((item, index) => (
            <div
              key={index}
              className="rounded-lg shadow-lg p-[25px] my-[15px] w-full"
            >
              {/* Sumon's code here */}
              <div className="blank"></div>
              <p className=" pb-[30px] font-bold  text-p-blue">
                User id: {item._id}
              </p>
              <p className=" pb-[30px] font-bold  text-p-blue">
                User Name: {item.userName}
              </p>
              <p className=" pb-[30px] font-bold  text-p-blue">
                User Email: {item.email}
              </p>
              <p className=" pb-[30px] font-bold  text-p-blue">
                User From: {formatDateTime(item.createdAt)}
              </p>
              <p className=" pb-[30px] font-bold  text-p-blue">
                User Varified: {item.verified ? "True" : "false"}
              </p>
              <div className="flex items-center justify-end gap-3 btn-main">
                {item.blocking === "unblock" ? (
                  <button
                    onClick={() => userBlock(item._id)}
                    className="px-[30px] py-[5px] rounded-lg bg-red-500 text-white font-semibold text-[18px] cursor-pointer"
                  >
                    Block
                  </button>
                ) : (
                  <button
                    onClick={() => userUnBlock(item._id)}
                    className="px-[30px] py-[5px] rounded-lg bg-green-500 text-white font-semibold text-[18px] cursor-pointer"
                  >
                    Unblock
                  </button>
                )}
                <button
                  onClick={() => deleteUser(item._id)}
                  className="px-[30px] py-[5px] rounded-lg bg-green-500 text-white font-semibold text-[18px] cursor-pointer"
                >
                  Delete User
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default page;
