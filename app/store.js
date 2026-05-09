
import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./_slices/userSlice";
import dashboardSlice from "./_slices/dashboardSlice";

export const store = configureStore({
  reducer: {
    userData: userSlice,
    dashboardData: dashboardSlice,
  },
});