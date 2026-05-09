"use client";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { MdAddBusiness } from "react-icons/md";
import { useSelector } from "react-redux";

const page = () => {
  const categories = useSelector((state) => state.dashboardData.menuCategories);
  const firstVisibleCategory = categories.find((item) => item.visible !== false);

  return (
    <>
      <div className="py-[100px] flex justify-center flex-col gap-5 items-center">
        <MdAddBusiness className="text-[100px] text-p-yellow" />
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Start Adding your Menu items
        </h3>
        <CommonButton
          title={"start now"}
          href={
            firstVisibleCategory
              ? `/dashboard/add-menu/${firstVisibleCategory.slug}`
              : "/dashboard/menu-manager"
          }
        />
      </div>
    </>
  );
};

export default page;
