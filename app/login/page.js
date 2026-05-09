"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import logo from "../_svg/logo.svg";
import Image from "next/image";
import CommonButton from "../_components/_common-button/CommonButton";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { InfinitySpin } from "react-loader-spinner";
import Cookies from "js-cookie";
import { useSelector, useDispatch } from "react-redux";
import { activeUser } from "../_slices/userSlice";
import apiUrl from "@/app/_host/apiURL";


const LoginPage = () => {
  let data = useSelector((state) => state);
  const disp = useDispatch();
  const router = useRouter();
  const [secretKey, setSecretKey] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loader, setLoader] = useState(false);
  // let [responseMessage, setResponseMessage] = useState("")

  const branches = [
    "Edmonton",
    "Fort McMurray",
    "Thickwood",
    "Downtown",
    "Beacon Hill",
    "Timberlea",
  ];

  // check that admin is login or not
  useEffect(() => {
    if (data.userData.userInfo) {
      router.push("/dashboard");
    }
  }, []);

  const handleLogin = () => {
    setLoader(true);

    axios
      .post(`${apiUrl}/api/v1/auth/login`, {
        branchName: selectedBranch,
        secretKey: secretKey,
      })
      .then((response) => {
        if (response.data.message === "Login successful") {
          disp(activeUser(response.data.data));
          // Set cookie after successful login
          Cookies.set("adminData", JSON.stringify(response.data.data), {
            expires: 7,
          }); // Adjust expiry as needed
          const adminData = Cookies.get("adminData");
          console.log("Value of adminData cookie:", adminData);

          // Redirect to dashboard
          return router.push("/dashboard");
        } else {
          toast(response.data.message);
          setLoader(false);
        }
        setSecretKey("");
        setSelectedBranch("");
      })
      .catch((error) => {
        console.error("Login Error:", error);
        setLoader(false);
      });
  };

  return (
    <div className="relative h-screen bg-p-yellow">
      <ToastContainer />
      <div
        className="h-[50%] relative w-full"
        style={{
          backgroundImage: `url('https://i.postimg.cc/5N4sbz8T/storyslide2-2.png')`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute w-full h-full bg-[#000000d1]"></div>
      </div>
      <div className="px-[10px] flex justify-center absolute top-[50%] left-[50%] w-full translate-x-[-50%] translate-y-[-50%]">
        <div className="  w-full md:w-[400px] flex-col gap-y-5 shadow-lg bg-white rounded-lg p-5 flex justify-center items-center">
          <Image
            src={logo}
            className="w-[150px] h-auto hidden md:block"
            alt="logo"
          />
          <h1 className="text-2xl font-bold text-center text-p-brown">
            Login to your branch
          </h1>
          <input
            type="password"
            placeholder="Enter Branch Secret Key"
            className="w-full p-2 border rounded outline-p-red"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
          <select
            className="w-full p-2 border rounded"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="" disabled>
              Select Branch
            </option>
            {branches.map((branch, index) => (
              <option key={index} value={branch}>
                {branch}
              </option>
            ))}
          </select>
          <div className="flex justify-center">
            {loader ? (
              <InfinitySpin
                visible={true}
                width="200"
                color="#005B89"
                ariaLabel="infinity-spin-loading"
              />
            ) : (
              <CommonButton title={"Login"} onClick={handleLogin} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
