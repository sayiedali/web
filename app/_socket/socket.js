import io from "socket.io-client";
import { apiConfig } from "@/app/_host/apiURL";

const URL =
  apiConfig.apiUrl ||
  (process.env.NODE_ENV === "development"
    ? "https://jomaaspizzaapi.onrender.com"
    : "");

export const socket = io(URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});
