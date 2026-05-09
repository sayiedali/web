"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";

const AddMenuNav = () => {
  const pathname = usePathname();
  const categories = useSelector((state) => state.dashboardData.menuCategories);
  const visibleCategories = categories.filter((item) => item.visible !== false);

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-10">
      {visibleCategories.map((item, index) => {
        const path = `/dashboard/add-menu/${item.slug}`;
        return (
          <Link
            key={`${item.slug}-${index}`}
            className={`${
              pathname === path
                ? "text-p-yellow bg-p-red"
                : "bg-p-yellow text-p-red"
            } px-[15px] py-[10px] capitalize  hover:bg-p-red hover:text-p-yellow duration-300 rounded-lg `}
            href={path}
          >
            {item.navitem}
          </Link>
        );
      })}
    </div>
  );
};

export default AddMenuNav;
