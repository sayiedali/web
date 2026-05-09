"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";

const page = () => {
  const params = useParams();
  const slug = params?.slug;
  const categories = useSelector((state) => state.dashboardData.menuCategories);
  const matchedCategory = categories.find((item) => item.slug === slug);

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto border rounded-xl p-6 bg-white shadow-sm">
        <h2 className="text-xl font-bold text-p-red mb-2">
          {matchedCategory?.navitem || "Category"} manager is ready
        </h2>
        <p className="text-gray-600 mb-4">
          This category was created dynamically from your admin dashboard.
          You can now connect this slug with your backend APIs for create/update/delete flows.
        </p>
        <div className="bg-p-yellow/30 rounded-md p-3 text-sm text-p-brown">
          Slug: <strong>{slug}</strong>
        </div>
        <div className="mt-5">
          <Link className="text-p-red underline" href="/dashboard/menu-manager">
            Manage categories and navigation
          </Link>
        </div>
      </div>
    </div>
  );
};

export default page;
