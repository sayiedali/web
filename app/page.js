"use client";
import { useEffect } from "react";
import Image from "next/image";
import CommonButton from "./_components/_common-button/CommonButton";
import logo from "./_svg/logo.svg";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

const page = () => {
  let data = useSelector((state) => state);

  let router = useRouter();
  // check that admin is login or not
  useEffect(() => {
    if (data.userData.userInfo) {
      router.push("/dashboard");
    }
  }, []);

  return (
    <div className=" w-full h-[100vh] bg-p-yellow">
      <div
        className="h-[50%] relative w-full"
        style={{
          backgroundImage: `url('https://i.postimg.cc/y8Rt7W0m/pagebanner.png')`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
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
            Jomaas Admin Panel
          </h1>
          <small className="text-p-brown">Manage All Branch from here!</small>
          <CommonButton title={"Goto Login"} href={"/login"} />
        </div>
      </div>
    </div>
  );
};

export default page;
