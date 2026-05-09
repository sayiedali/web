"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LogoMenuNav = () => {
  const pathname = usePathname();

  const logoMenuNav = [
    {
      navitem: "Header Logo",
      path: "/dashboard/add-logo/header-logo",
    }
  ];


// {
//   navitem: "Footer Logo",
//   path: "/dashboard/add-logo/footer-logo",
// },


  return (
    <div className="flex flex-wrap justify-center gap-3 mb-10">
      {logoMenuNav.map((item, index) => (
        <Link
          key={index}
          className={`${
            pathname === item.path
              ? "text-p-yellow bg-p-red"
              : "bg-p-yellow text-p-red"
          } px-[15px] py-[10px] capitalize  hover:bg-p-red hover:text-p-yellow duration-300 rounded-lg `}
          href={item.path}
        >
          {item.navitem}
        </Link>
      ))}
    </div>
  );
};

export default LogoMenuNav;
