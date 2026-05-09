"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Nav from "../_components/_nav/Nav";
import TopNav from "../_components/_topNav/TopNav";
import { hydrateDashboardState } from "../_slices/dashboardSlice";

export default function DashboardLayout({ children }) {
  let data = useSelector((state) => state.userData);
  const dashboardData = useSelector((state) => state.dashboardData);
  let router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!data.userInfo) {
      router.push("/");
    }
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem("dashboardData");
    if (savedState) {
      dispatch(hydrateDashboardState(JSON.parse(savedState)));
    }
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem("dashboardData", JSON.stringify(dashboardData));
  }, [dashboardData]);

  return (
    <section>
      <TopNav />
      <div className="flex ">
        <Nav />
        {children}
      </div>
    </section>
  );
}
