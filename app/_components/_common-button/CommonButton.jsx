"use client";
import React from "react";
import Link from "next/link";
import { GiFullPizza } from "react-icons/gi";
import "./button.css"
import { FaBurger } from "react-icons/fa6";


const CommonButton = ({ href, onClick, title }) => {
  return (
    <>
      {href ? (
        <Link
          className="capitalize px-[20px] py-[10px] bg-p-red rounded-lg duration-300 font-bold hover:shadow-lg text-p-yellow  overflow-hidden relative group"
          href={href}
        >
        <GiFullPizza className="  circle-anim absolute top-[-5px] text-[60px] left-[-80px] group-hover:left-[-30px] duration-300" />  <span className="duration-300 group-hover:ml-[18px] text-[20px]">{title}</span>
        </Link>
      ) : (
        <div
          className="capitalize px-[20px] py-[10px] hover:shadow-lg cursor-pointer bg-p-red rounded-lg duration-300 font-bold  text-p-yellow overflow-hidden relative group"
          onClick={onClick}
        >
        <GiFullPizza className="  circle-anim absolute top-[-5px]  text-[60px] left-[-80px] group-hover:left-[-30px] duration-300" />  <span className="duration-300 group-hover:ml-[18px] text-[20px]">{title}</span>
        </div>
      )}
    </>
  );
};

export default CommonButton;
