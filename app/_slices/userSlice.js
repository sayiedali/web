import { createSlice } from "@reduxjs/toolkit";
import Cookies from "js-cookie";

export const userSlice = createSlice({
  name: "user",
  initialState: {
    userInfo: Cookies.get("adminData")
      ? JSON.parse(Cookies.get("adminData"))
      : null,
  },
  reducers: {
    activeUser: (state, action) => {
      state.userInfo = action.payload;
    },
    // decrement: (state) => {
    //   state.value -= 1;
    // },
    // incrementByAmount: (state, action) => {
    //   state.value += action.payload;
    // },
  },
});

// Action creators are generated for each case reducer function
export const { activeUser } = userSlice.actions;

export default userSlice.reducer;