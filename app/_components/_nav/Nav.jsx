"use client";

import Link from "next/link";
import { LuLayoutDashboard } from "react-icons/lu";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logo from "../../_svg/logo.svg";
import { MdOutlinePendingActions, MdConnectWithoutContact, MdLocalOffer, MdPointOfSale, MdOutlineKitchen, MdLocalShipping } from "react-icons/md";
import { GrSchedules } from "react-icons/gr";
import { GiConfirmed } from "react-icons/gi";
import { RiAddBoxLine, RiCoupon3Line, RiUploadCloudLine } from "react-icons/ri";
import { FaTimes, FaUsers } from "react-icons/fa";
import { TbListDetails } from "react-icons/tb";
import { useSelector } from "react-redux";

const iconMap = {
  dashboard: <LuLayoutDashboard />,
  logo: <RiUploadCloudLine />,
  schedule: <GrSchedules />,
  coupon: <RiCoupon3Line />,
  pending: <MdOutlinePendingActions />,
  accepted: <GiConfirmed />,
  rejected: <FaTimes />,
  menu: <RiAddBoxLine />,
  users: <FaUsers />,
  contact: <MdConnectWithoutContact />,
  deliverySettings: <MdLocalShipping />,
  deliveryManagement: <MdLocalShipping />,
  deliveryProviders: <MdLocalShipping />,
  payroll: <RiCoupon3Line />,
  deals: <MdLocalOffer />,
  pos: <MdPointOfSale />,
  kds: <MdOutlineKitchen />,
};

const Nav = () => {
  const pathname = usePathname();
  const navItems = useSelector((state) => state.dashboardData.navItems);
  const pageTitleMap = {
    "/dashboard/pending-orders": "Live Orders",
    "/dashboard/pending-orders-later": "Scheduled Orders",
    "/dashboard/confirm-orders": "Completed Orders",
    "/dashboard/delivery-management": "Delivery Management",
    "/dashboard/deliveryman": "Manage Drivers",
    "/dashboard/delivery-providers": "Delivery Providers",
    "/dashboard/payroll-reports": "Payroll & Reports",
    "/dashboard/delivery-promotions": "Free Delivery Promos",
    "/dashboard/delivery-fee-settings": "Delivery Fee Settings",
    "/dashboard/store-schedule": "Store Hours & Operations",
  };


  const visibleNavItems = navItems.filter((item) => item.visible !== false);

  return (
    <nav className="h-[100vh] z-[999999] py-[10px] sticky left-0 top-[72px] shadow-md inline-block px-[10px] justify-between bg-p-yellow">
      {
        <div className="hidden md:block absolute top-[10px] right-[-360px] text-xl md:text-2xl text-p-red font-semibold mt-1 uppercase w-[350px] text-primary-main-blue">
          {pathname === "/dashboard"
            ? "Dashboard"
            : pageTitleMap[pathname] || pathname.slice(11, pathname.length)}
        </div>
      }
      <div className="flex flex-col gap-y-5">
        <div className="flex items-center justify-center">
          <img
            src="https://i.postimg.cc/rwnxStLC/fav.png"
            className="w-[70px] h-auto block md:hidden"
            alt="logo"
          />
          <Image
            src={logo}
            className="w-[150px] h-auto hidden md:block"
            alt="logo"
          />
        </div>
        <ul className="flex flex-col gap-y-2">
          {visibleNavItems.map((item, index) => (
            <li
              key={`${item.path}-${index}`}
              className="w-[70px]  md:w-[250px]"
              title={item.navitem}
            >
              <Link
                href={item.path}
                className={`${
                  pathname === item.path
                    ? "bg-p-red text-white"
                    : "text-p-brown shadow-inner"
                } w-full py-[10px] text-center   gap-x-1  rounded-lg flex items-center justify-center duration-200 hover:bg-p-red hover:text-white`}
              >
                {iconMap[item.iconKey] || <TbListDetails />} {" "}
                <span className="hidden md:block">{item.navitem}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Nav;
