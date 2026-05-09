"use client";
import { useEffect, useState } from "react";
import { IoMdLogOut } from "react-icons/io";
import { useDispatch } from "react-redux";
import axios from "axios";
import { activeUser } from "@/app/_slices/userSlice";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Switch } from "antd";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const SHOP_STATUS_ENDPOINTS = [
  "/api/v1/service-control/status",
  "/api/v1/store-operations/status",
  "/api/v1/jomaas/shop/status",
];
const SHOP_TOGGLE_ENDPOINTS = [
  "/api/v1/service-control/toggle",
  "/api/v1/store-operations/toggle",
  "/api/v1/jomaas/shop/toggle",
];

const parseApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const TopNav = () => {
  let disp = useDispatch();
  let router = useRouter();

  const [shopToggle, setShopToggle] = useState(false);

  let handlelogout = () => {
    Cookies.remove("adminData");
    disp(activeUser(null));
    router.push("/");
  };

  const handleShopToggle = (data) => {
    setShopToggle(data);
    const requestToggle = async () => {
      let lastError;
      for (const endpoint of SHOP_TOGGLE_ENDPOINTS) {
        try {
          const response = await axios.post(
            `${apiUrl}${endpoint}`,
            { isActive: data },
            {
              auth: {
                username: "user",
                password: postToken,
              },
            },
          );
          if ("success" in response.data) {
            setShopToggle(!!response?.data?.success);
            toast.success(response?.data?.success ? "Shop is now On" : "Shop is now Off");
            return;
          }
        } catch (error) {
          lastError = error;
          if (error?.response?.status !== 404) break;
        }
      }

      setShopToggle(!data);
      toast.error(parseApiError(lastError, "Unable to update shop status right now."));
    };

    requestToggle();
  };

  useEffect(() => {
    const loadShopStatus = async () => {
      for (const endpoint of SHOP_STATUS_ENDPOINTS) {
        try {
          const response = await axios.get(`${apiUrl}${endpoint}`, {
            auth: {
              username: "user",
              password: getToken,
            },
          });
          if ("success" in response.data) {
            setShopToggle(!!response?.data?.success);
            return;
          }
        } catch (error) {
          if (error?.response?.status !== 404) {
            return;
          }
        }
      }
    };

    loadShopStatus();
  }, []);

  return (
    <div className="fixed py-2 md:py-[20px] px-[10px] shadow-lg bg-p-yellow w-full flex items-center z-[9999] justify-between top-0 right-0 gap-2">
      <ToastContainer position="top-center" autoClose={2000} />

      <div className="flex items-center gap-2 px-2 md:px-3 py-1 md:mr-5 font-semibold border text-p-red rounded-3xl text-xs md:text-base whitespace-nowrap">
        <span className="hidden sm:inline">Turn on your shop</span>
        <span className="sm:hidden">Shop</span>
        <Switch
          checked={shopToggle}
          className="!bg-[#d1d1d1] shadow-inner"
          onChange={(tf) => handleShopToggle(tf)}
        />
      </div>
      <div className="flex items-center gap-x-2 md:gap-x-3">
        <span className="font-semibold text-p-brown hidden lg:inline">
          Jomaa's Pizza & Donair,{" "} Edmonton-Branch.
        </span>
        <div className="cursor-pointer flex items-center font-bold underline text-p-red text-sm md:text-base md:border-l md:border-p-red md:pl-[10px]">
          <div onClick={handlelogout} className="flex items-center gap-x-1">
            <IoMdLogOut className="text-[20px]" /> <span>Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
