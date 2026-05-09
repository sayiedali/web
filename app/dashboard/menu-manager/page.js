"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addMenuCategory,
  toggleMenuCategoryVisibility,
  toggleNavVisibility,
} from "@/app/_slices/dashboardSlice";

const page = () => {
  const dispatch = useDispatch();
  const navItems = useSelector((state) => state.dashboardData.navItems);
  const menuCategories = useSelector((state) => state.dashboardData.menuCategories);
  const [menuForm, setMenuForm] = useState({ navitem: "", slug: "" });

  const slugify = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!menuForm.navitem) return;

    const preparedSlug = menuForm.slug ? slugify(menuForm.slug) : slugify(menuForm.navitem);

    const duplicate = menuCategories.find((item) => item.slug === preparedSlug);
    if (duplicate) {
      alert("This menu slug already exists.");
      return;
    }

    dispatch(
      addMenuCategory({
        navitem: menuForm.navitem,
        slug: preparedSlug,
        visible: true,
      }),
    );

    setMenuForm({ navitem: "", slug: "" });
  };

  return (
    <div className="w-full pt-[80px] p-4">
      <h1 className="text-2xl md:text-3xl font-bold text-p-red mb-6">Menu & Navigation Manager</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold text-p-brown mb-4">Sidebar Navigation Visibility</h2>
          <div className="space-y-2">
            {navItems.map((item) => (
              <label key={item.path} className="flex items-center justify-between p-2 border rounded-md">
                <span className="text-p-brown">{item.navitem}</span>
                <input
                  type="checkbox"
                  checked={item.visible !== false}
                  onChange={() => dispatch(toggleNavVisibility(item.path))}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold text-p-brown mb-4">Add Menu Category</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="w-full border rounded-md p-2"
              placeholder="Category name (e.g. Family Combo)"
              value={menuForm.navitem}
              onChange={(e) =>
                setMenuForm((prev) => ({ ...prev, navitem: e.target.value }))
              }
            />
            <input
              className="w-full border rounded-md p-2"
              placeholder="Custom slug (optional)"
              value={menuForm.slug}
              onChange={(e) => setMenuForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
            <button className="bg-p-red text-white px-4 py-2 rounded-md">Create Category</button>
          </form>

          <h3 className="text-lg font-semibold text-p-brown mt-6 mb-2">Show/Hide Categories</h3>
          <div className="space-y-2">
            {menuCategories.map((item) => (
              <label key={item.slug} className="flex items-center justify-between p-2 border rounded-md">
                <span>
                  {item.navitem} <small className="text-gray-500">({item.slug})</small>
                </span>
                <input
                  type="checkbox"
                  checked={item.visible !== false}
                  onChange={() => dispatch(toggleMenuCategoryVisibility(item.slug))}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
