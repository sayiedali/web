import { createSlice } from "@reduxjs/toolkit";

export const defaultNavItems = [
  {
    navitem: "Dashboard",
    path: "/dashboard",
    iconKey: "dashboard",
    visible: true,
  },
  {
    navitem: "Add Logo",
    path: "/dashboard/add-logo/header-logo",
    iconKey: "logo",
    visible: true,
  },
  {
    navitem: "Shop Schedule",
    path: "/dashboard/store-schedule",
    iconKey: "schedule",
    visible: true,
  },
  {
    navitem: "Coupons",
    path: "/dashboard/add-coupon",
    iconKey: "coupon",
    visible: true,
  },
  {
    navitem: "Live Orders",
    path: "/dashboard/pending-orders",
    iconKey: "pending",
    visible: true,
  },
  {
    navitem: "Scheduled Orders",
    path: "/dashboard/pending-orders-later",
    iconKey: "pending",
    visible: true,
  },
  {
    navitem: "Completed Orders",
    path: "/dashboard/confirm-orders",
    iconKey: "accepted",
    visible: true,
  },
  {
    navitem: "Rejected Orders",
    path: "/dashboard/rejected-orders",
    iconKey: "rejected",
    visible: true,
  },
  {
    navitem: "Add Menu",
    path: "/dashboard/add-menu",
    iconKey: "menu",
    visible: true,
  },
  {
    navitem: "Menu Manager",
    path: "/dashboard/menu-manager",
    iconKey: "menu",
    visible: true,
  },
  {
    navitem: "Customers",
    path: "/dashboard/customers",
    iconKey: "users",
    visible: true,
  },
  {
    navitem: "Contact Requests",
    path: "/dashboard/contact-request",
    iconKey: "contact",
    visible: true,
  },
  {
    navitem: "POS Terminal",
    path: "/dashboard/pos",
    iconKey: "pos",
    visible: true,
  },
  {
    navitem: "Kitchen Display",
    path: "/dashboard/kds",
    iconKey: "kds",
    visible: true,
  },
  {
    navitem: "Delivery Settings",
    path: "/dashboard/delivery-fee-settings",
    iconKey: "deliverySettings",
    visible: true,
  },
  {
    navitem: "Delivery Promotions",
    path: "/dashboard/delivery-promotions",
    iconKey: "deliverySettings",
    visible: true,
  },
];

export const defaultMenuCategories = [
  { navitem: "Pizza", slug: "pizza", visible: true },
  { navitem: "2 for 1 Pizzas", slug: "two-for-one-pizzas", visible: true },
  { navitem: "Donair", slug: "donair", visible: true },
  { navitem: "Wings", slug: "wings", visible: true },
  { navitem: "Poutines", slug: "poutines", visible: true },
  { navitem: "Chicken", slug: "chicken", visible: true },
  { navitem: "Panzarotti", slug: "panzarotti", visible: true },
  { navitem: "Garlic Fingers", slug: "garlic-fingers", visible: true },
  { navitem: "Burgers", slug: "burgers", visible: true },
  { navitem: "Salads", slug: "salads", visible: true },
  { navitem: "Speciality Pasta", slug: "speciality-pasta", visible: true },
  { navitem: "Sub", slug: "sub", visible: true },
  { navitem: "Beverages", slug: "beverages", visible: true },
  { navitem: "Sauce", slug: "sauce", visible: true },
  { navitem: "Toppings", slug: "toppings", visible: true },
];

const deprecatedNavPaths = new Set(["/dashboard/deals"]);

const initialState = {
  navItems: defaultNavItems,
  menuCategories: defaultMenuCategories,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    hydrateDashboardState: (state, action) => {
      if (!action.payload) return;
      const incomingNavItems = Array.isArray(action.payload.navItems)
        ? action.payload.navItems
        : [];
      const incomingMenuCategories = Array.isArray(action.payload.menuCategories)
        ? action.payload.menuCategories
        : [];

      const mergedNavItems = defaultNavItems.map((defaultItem) => {
        const persisted = incomingNavItems.find(
          (item) => item.path === defaultItem.path,
        );
        return persisted ? { ...defaultItem, ...persisted } : defaultItem;
      });

      const extraPersistedNavItems = incomingNavItems.filter(
        (item) =>
          item?.path &&
          !deprecatedNavPaths.has(item.path) &&
          !mergedNavItems.some((mergedItem) => mergedItem.path === item.path),
      );

      const mergedMenuCategories = defaultMenuCategories.map((defaultItem) => {
        const persisted = incomingMenuCategories.find(
          (item) => item.slug === defaultItem.slug,
        );
        return persisted ? { ...defaultItem, ...persisted } : defaultItem;
      });

      return {
        ...state,
        ...action.payload,
        navItems: [...mergedNavItems, ...extraPersistedNavItems],
        menuCategories: mergedMenuCategories,
      };
    },
    toggleNavVisibility: (state, action) => {
      state.navItems = state.navItems.map((item) =>
        item.path === action.payload
          ? { ...item, visible: !item.visible }
          : item,
      );
    },
    addMenuCategory: (state, action) => {
      state.menuCategories.push(action.payload);
    },
    toggleMenuCategoryVisibility: (state, action) => {
      state.menuCategories = state.menuCategories.map((item) =>
        item.slug === action.payload
          ? { ...item, visible: !item.visible }
          : item,
      );
    },
  },
});

export const {
  hydrateDashboardState,
  toggleNavVisibility,
  addMenuCategory,
  toggleMenuCategoryVisibility,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
