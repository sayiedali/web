"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { apiConfig, buildApiUrl } from "@/app/_host/apiURL";

const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;

const missingApiConfigMessage = "API base URL is not configured. Set NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_API_BASE_URL).";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Backend routes (see testadminapi/routes/api/storeSchedule.js):
//   GET  /api/v1/schedule/hours         -> getStoreHours
//   POST /api/v1/schedule/hours/update  -> updateStoreHours
// The backend accepts these same paths under several mount points
// (`/schedule`, `/store-operations`, `/store-hours`, `/service-control`),
// so we list fallbacks to stay resilient to env-specific route mounts.
const READ_ENDPOINTS = [
  "/api/v1/schedule/hours",
  "/api/v1/store-hours/hours",
  "/api/v1/store-operations/hours",
  "/api/v1/service-control/hours",
];

const WRITE_ENDPOINTS = [
  "/api/v1/schedule/hours/update",
  "/api/v1/store-hours/hours/update",
  "/api/v1/store-operations/hours/update",
  "/api/v1/service-control/hours/update",
];

const createDefaultDay = (dayName) => ({
  dayName,
  openTime: "09:00",
  closeTime: "21:00",
  isClosed: false,
  pickupEnabled: true,
  deliveryEnabled: true,
});

const parseBackendError = (error) => (
  error?.response?.data?.error?.message
  || error?.response?.data?.message
  || error?.response?.data?.error
  || error?.response?.data?.success?.message
  || error?.message
  || "Request failed."
);

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
};

const to24HourTime = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!twelveHourMatch) return null;
  let hours = Number(twelveHourMatch[1]);
  const minutes = twelveHourMatch[2];
  const period = twelveHourMatch[3].toUpperCase();
  if (hours < 1 || hours > 12) return null;
  if (period === "AM") {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

const toTimeValue = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const converted12Hour = to24HourTime(trimmed);
  if (converted12Hour) return converted12Hour;
  const embeddedTimeMatch = trimmed.match(/T(\d{2}:\d{2})/);
  if (embeddedTimeMatch?.[1]) return embeddedTimeMatch[1];
  const plainTimeMatch = trimmed.match(/\b(\d{2}:\d{2})(?::\d{2})?\b/);
  if (plainTimeMatch?.[1]) return plainTimeMatch[1];

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return fallback;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const resolveIsClosed = (raw, fallback) => {
  if (!raw || typeof raw !== "object") return fallback;
  if (raw.isClosed !== undefined) return parseBoolean(raw.isClosed, fallback);
  if (raw.closed !== undefined) return parseBoolean(raw.closed, fallback);
  if (raw.is_close !== undefined) return parseBoolean(raw.is_close, fallback);
  if (raw.is_closed !== undefined) return parseBoolean(raw.is_closed, fallback);
  // Backend returns isOpen/enabled/is_open — invert to derive isClosed.
  if (raw.isOpen !== undefined) return !parseBoolean(raw.isOpen, true);
  if (raw.enabled !== undefined) return !parseBoolean(raw.enabled, true);
  if (raw.is_open !== undefined) return !parseBoolean(raw.is_open, true);
  return fallback;
};

const normalizeDayEntry = (dayName, raw) => {
  const fallback = createDefaultDay(dayName);
  if (!raw || typeof raw !== "object") return fallback;

  const isClosed = resolveIsClosed(raw, fallback.isClosed);

  return {
    dayName,
    openTime: toTimeValue(raw.openTime ?? raw.open ?? raw.startTime ?? raw.from, fallback.openTime),
    closeTime: toTimeValue(raw.closeTime ?? raw.close ?? raw.endTime ?? raw.to, fallback.closeTime),
    isClosed,
    pickupEnabled: parseBoolean(raw.pickupEnabled ?? raw.pickup ?? raw.isPickupAvailable, fallback.pickupEnabled),
    deliveryEnabled: parseBoolean(raw.deliveryEnabled ?? raw.delivery ?? raw.isDeliveryAvailable, fallback.deliveryEnabled),
  };
};

const normalizeSchedulePayload = (payload) => {
  // Backend returns { success: { data: { storeHours: { monday: {...}, ... } } } }
  const data = payload?.success?.data ?? payload?.data ?? payload;
  const raw = data?.storeHours ?? data?.hours ?? data;

  const normalizeFromArray = (items) => {
    const map = new Map();
    items.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const rawDay = String(item.dayName ?? item.day ?? "").trim().toLowerCase();
      const matchedDay = DAYS.find((day) => day.toLowerCase() === rawDay);
      if (!matchedDay) return;
      map.set(matchedDay, item);
    });

    return DAYS.map((day) => normalizeDayEntry(day, map.get(day)));
  };

  if (Array.isArray(raw)) return normalizeFromArray(raw);

  if (Array.isArray(raw?.schedule)) return normalizeFromArray(raw.schedule);

  if (raw && typeof raw === "object") {
    const lowerKeyLookup = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key.toLowerCase(), value]),
    );

    return DAYS.map((day) => normalizeDayEntry(day, lowerKeyLookup[day.toLowerCase()]));
  }

  return DAYS.map(createDefaultDay);
};

const getNowStatus = (scheduleRows) => {
  const now = new Date();
  const jsDay = now.getDay();
  const index = jsDay === 0 ? 6 : jsDay - 1;
  const todaySchedule = scheduleRows[index] || createDefaultDay(DAYS[index] || "Monday");

  if (todaySchedule.isClosed) {
    return {
      openStatus: "Closed now",
      pickupStatus: "Pickup unavailable",
      deliveryStatus: "Delivery unavailable",
      dayName: todaySchedule.dayName,
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = todaySchedule.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = todaySchedule.closeTime.split(":").map(Number);
  const openMinutes = (openHour || 0) * 60 + (openMinute || 0);
  const closeMinutes = (closeHour || 0) * 60 + (closeMinute || 0);

  const openNow = closeMinutes > openMinutes
    ? nowMinutes >= openMinutes && nowMinutes < closeMinutes
    : true;

  return {
    openStatus: openNow ? "Open now" : "Closed now",
    pickupStatus: todaySchedule.pickupEnabled ? "Pickup available" : "Pickup unavailable",
    deliveryStatus: todaySchedule.deliveryEnabled ? "Delivery available" : "Delivery unavailable",
    dayName: todaySchedule.dayName,
  };
};

// Build the payload the backend's updateStoreHours controller expects:
//   { storeHours: { monday: { open: "HH:mm", close: "HH:mm", isOpen: boolean }, ... } }
// Day keys must be lowercase canonical names; times must match ^([01]\d|2[0-3]):([0-5]\d)$.
const buildStoreHoursPayload = (scheduleRows) => {
  const storeHours = {};
  scheduleRows.forEach((row) => {
    const dayKey = String(row.dayName || "").trim().toLowerCase();
    if (!dayKey) return;
    storeHours[dayKey] = {
      open: row.openTime,
      close: row.closeTime,
      isOpen: !row.isClosed,
      pickupEnabled: !!row.pickupEnabled,
      deliveryEnabled: !!row.deliveryEnabled,
    };
  });
  return { storeHours };
};

const PAUSE_DURATIONS = ["15m", "1h", "2h", "until_tomorrow"];

export default function StoreSchedulePage() {
  const user = useSelector((state) => state.userData.userInfo);
  const branch = user?.branchName || "default";

  const [scheduleRows, setScheduleRows] = useState(() => DAYS.map(createDefaultDay));
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [apiNotice, setApiNotice] = useState("");
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pickupPaused, setPickupPaused] = useState(false);
  const [pickupPausedUntil, setPickupPausedUntil] = useState(null);
  const [deliveryPaused, setDeliveryPaused] = useState(false);
  const [deliveryPausedUntil, setDeliveryPausedUntil] = useState(null);
  const [pauseReason, setPauseReason] = useState("");
  const [liveStatus, setLiveStatus] = useState(null);

  const authGet = { auth: { username: "user", password: getToken } };
  const authPost = { auth: { username: "user", password: postToken } };

  const requireApiRoute = (path) => {
    const url = buildApiUrl(path);
    if (url) return url;
    throw new Error("API base URL is not configured");
  };

  const PAUSE_ENDPOINTS = {
    pickupPause: [
      "/api/v1/schedule/pause/pickup",
      "/api/v1/store-operations/pause/pickup",
      "/api/v1/service-control/pause/pickup",
    ],
    deliveryPause: [
      "/api/v1/schedule/pause/delivery",
      "/api/v1/store-operations/pause/delivery",
      "/api/v1/service-control/pause/delivery",
    ],
    pickupResume: [
      "/api/v1/schedule/resume/pickup",
      "/api/v1/store-operations/resume/pickup",
      "/api/v1/service-control/resume/pickup",
    ],
    deliveryResume: [
      "/api/v1/schedule/resume/delivery",
      "/api/v1/store-operations/resume/delivery",
      "/api/v1/service-control/resume/delivery",
    ],
    pickupStatus: [
      "/api/v1/schedule/pickup/status",
      "/api/v1/store-operations/pickup/status",
      "/api/v1/service-control/pickup/status",
    ],
    deliveryStatus: [
      "/api/v1/schedule/delivery/status",
      "/api/v1/store-operations/delivery/status",
      "/api/v1/service-control/delivery/status",
    ],
  };

  const tryEndpoints = async (endpoints, method, payload = {}) => {
    let lastError = null;
    let lastStatus = null;
    for (const endpoint of endpoints) {
      try {
        const url = requireApiRoute(endpoint);
        const config = method === "post" ? authPost : authGet;
        const response = method === "post"
          ? await axios.post(url, payload, config)
          : await axios.get(url, { ...config, params: payload });
        return response.data;
      } catch (error) {
        lastError = error?.response?.data?.error?.message
          || error?.response?.data?.message
          || error?.response?.data?.error
          || error?.message;
        lastStatus = error?.response?.status;
        console.error(`[store-schedule] ${endpoint} failed (${lastStatus}):`, lastError);
        continue;
      }
    }
    const message = lastError || `All ${endpoints.length} endpoints failed`;
    console.error(`[store-schedule] All endpoints exhausted. Last error: ${message}`);
    throw new Error(message);
  };

  const handlePause = async (target, duration) => {
    if (!apiConfig.isConfigured) {
      toast.error(missingApiConfigMessage);
      return;
    }
    setPauseLoading(true);
    try {
      const endpoints = target === "pickup" ? PAUSE_ENDPOINTS.pickupPause : PAUSE_ENDPOINTS.deliveryPause;
      await tryEndpoints(endpoints, "post", {
        branch,
        duration,
        reason: pauseReason,
        type: "manual_pause",
      });
      toast.success(`${target === "pickup" ? "Pickup" : "Delivery"} paused for ${duration}`);
      setPauseReason("");
      await loadPauseStatus();
      await loadLiveStatus();
    } catch (error) {
      const message = error?.message || `Failed to pause ${target}`;
      toast.error(message);
      console.error(`[store-schedule] handlePause error:`, error);
    } finally {
      setPauseLoading(false);
    }
  };

  const handleResume = async (target) => {
    if (!apiConfig.isConfigured) {
      toast.error(missingApiConfigMessage);
      return;
    }
    setPauseLoading(true);
    try {
      const endpoints = target === "pickup" ? PAUSE_ENDPOINTS.pickupResume : PAUSE_ENDPOINTS.deliveryResume;
      await tryEndpoints(endpoints, "post", {
        branch,
        target,
      });
      toast.success(`${target === "pickup" ? "Pickup" : "Delivery"} resumed`);
      await loadPauseStatus();
      await loadLiveStatus();
    } catch (error) {
      const message = error?.message || `Failed to resume ${target}`;
      toast.error(message);
      console.error(`[store-schedule] handleResume error:`, error);
    } finally {
      setPauseLoading(false);
    }
  };

  const loadPauseStatus = async () => {
    if (!apiConfig.isConfigured) return;
    try {
      const [pickupStatus, deliveryStatus] = await Promise.all([
        tryEndpoints(PAUSE_ENDPOINTS.pickupStatus, "get", { branch }).catch(() => ({})),
        tryEndpoints(PAUSE_ENDPOINTS.deliveryStatus, "get", { branch }).catch(() => ({})),
      ]);
      const pickupData = pickupStatus?.data?.success?.data || pickupStatus?.data || pickupStatus;
      const deliveryData = deliveryStatus?.data?.success?.data || deliveryStatus?.data || deliveryStatus;
      setPickupPaused(Boolean(pickupData?.paused || pickupData?.isPaused));
      setPickupPausedUntil(pickupData?.pausedUntil);
      setDeliveryPaused(Boolean(deliveryData?.paused || deliveryData?.isPaused));
      setDeliveryPausedUntil(deliveryData?.pausedUntil);
    } catch (error) {
      console.error("Error loading pause status:", error);
    }
  };

  const loadLiveStatus = async () => {
    if (!apiConfig.isConfigured) return;
    try {
      const response = await axios.post(
        requireApiRoute("/api/v1/schedule/check"),
        { branch },
        authPost
      );
      const data = response?.data?.success?.data || response?.data?.data || response?.data || {};
      setLiveStatus({
        currentDay: data.currentDay,
        currentTime: data.currentTime,
        storeOpen: data.storeOpen,
        pickupAvailable: data.pickupAvailable,
        deliveryAvailable: data.deliveryAvailable,
        pickupPaused: data.pickupPaused,
        deliveryPaused: data.deliveryPaused,
        store: data.store,
        pickup: data.pickup,
        delivery: data.delivery,
        storeHours: data.storeHours,
      });
    } catch (error) {
      console.error("Error loading live status:", error);
      setLiveStatus(null);
    }
  };

  const loadSchedule = async () => {
    if (!apiConfig.isConfigured) {
      setApiNotice(missingApiConfigMessage);
      setScheduleRows(DAYS.map(createDefaultDay));
      setLoading(false);
      return;
    }

    let loaded = false;
    let lastErrorMessage = "";

    for (const endpoint of READ_ENDPOINTS) {
      try {
        const { data } = await axios.get(requireApiRoute(endpoint), {
          ...authGet,
          params: { branch },
        });
        setScheduleRows(normalizeSchedulePayload(data));
        setApiNotice("");
        loaded = true;
        break;
      } catch (error) {
        lastErrorMessage = parseBackendError(error);
      }
    }

    if (!loaded) {
      setScheduleRows(DAYS.map(createDefaultDay));
      setApiNotice(lastErrorMessage || "No schedule endpoint responded. Using default schedule.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSchedule();
    loadPauseStatus();
    loadLiveStatus();
  }, []);

  const updateRow = (dayName, patch) => {
    setScheduleRows((prev) => prev.map((row) => {
      if (row.dayName !== dayName) return row;
      const nextRow = { ...row, ...patch };
      return nextRow;
    }));
  };

  const handleSaveAll = async () => {
    if (!apiConfig.isConfigured) {
      toast.error(missingApiConfigMessage);
      return;
    }

    setSaveLoading(true);

    const payload = {
      ...buildStoreHoursPayload(scheduleRows),
      branch,
      timezone: "America/Edmonton",
    };

    let saved = false;
    let lastErrorMessage = "";

    for (const endpoint of WRITE_ENDPOINTS) {
      try {
        const { data } = await axios.post(requireApiRoute(endpoint), payload, authPost);
        if (data?.success === false) {
          throw new Error(
            data?.message || data?.error || "Backend rejected schedule save.",
          );
        }
        setApiNotice("");
        saved = true;
        break;
      } catch (error) {
        lastErrorMessage = parseBackendError(error);
      }
    }

    if (saved) {
      toast.success("Store schedule saved.");
      await loadSchedule();
      await loadLiveStatus();
    } else {
      const message = lastErrorMessage || "Unable to save schedule. Check backend schedule endpoints.";
      setApiNotice(message);
      toast.error(message);
    }

    setSaveLoading(false);
  };

  const nowStatus = useMemo(() => getNowStatus(scheduleRows), [scheduleRows]);

  if (loading) {
    return (
      <div className="pt-[96px] px-4 w-full text-center text-lg font-semibold text-p-brown">
        Loading store schedule...
      </div>
    );
  }

  return (
    <div className="pt-[84px] px-4 pb-10 w-full max-w-6xl mx-auto">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Store Schedule</h1>
        <p className="text-sm text-slate-500 mt-1">Set store hours for each day. Choose whether pickup and delivery are available for that day.</p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Current Status (Live from Backend)</h2>
        {liveStatus ? (
          <>
            <p className="text-sm text-slate-600 mt-2">Branch: {branch}</p>
            <p className="text-sm text-slate-600">Time: {liveStatus.currentDay || "unknown"} {liveStatus.currentTime || ""}</p>
            <p className="text-sm text-slate-600">Store: {liveStatus.storeOpen ? "Open" : "Closed"}</p>
            <p className="text-sm text-slate-600">
              Pickup: {liveStatus.pickupPaused ? "Paused" : liveStatus.pickupAvailable ? "Available" : "Unavailable"}
              {liveStatus.pickup?.reason && ` - ${liveStatus.pickup.reason}`}
            </p>
            <p className="text-sm text-slate-600">
              Delivery: {liveStatus.deliveryPaused ? "Paused" : liveStatus.deliveryAvailable ? "Available" : "Unavailable"}
              {liveStatus.delivery?.reason && ` - ${liveStatus.delivery.reason}`}
            </p>
            <p className="text-sm text-slate-500 mt-3">Business timezone: America/Edmonton</p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mt-2">{nowStatus.dayName}: {nowStatus.openStatus}</p>
            <p className="text-sm text-slate-600">{nowStatus.pickupStatus}</p>
            <p className="text-sm text-slate-600">{nowStatus.deliveryStatus}</p>
            <p className="text-sm text-slate-500 mt-3">Business timezone: America/Edmonton</p>
          </>
        )}
      </section>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Pickup Control</h2>
          {pickupPaused ? (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 font-semibold">Paused</p>
              <p className="text-xs text-red-700">{pickupPausedUntil}</p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 font-semibold">Available</p>
            </div>
          )}

          {!pickupPaused && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pause reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Staff break, maintenance"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PAUSE_DURATIONS.map((dur) => (
                  <button
                    key={dur}
                    onClick={() => handlePause("pickup", dur)}
                    disabled={pauseLoading}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    Pause {dur}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pickupPaused && (
            <button
              onClick={() => handleResume("pickup")}
              disabled={pauseLoading}
              className="mt-4 w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
            >
              Resume Pickup
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Delivery Control</h2>
          {deliveryPaused ? (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 font-semibold">Paused</p>
              <p className="text-xs text-red-700">{deliveryPausedUntil}</p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 font-semibold">Available</p>
            </div>
          )}

          {!deliveryPaused && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pause reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Delivery unavailable, driver break"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PAUSE_DURATIONS.map((dur) => (
                  <button
                    key={dur}
                    onClick={() => handlePause("delivery", dur)}
                    disabled={pauseLoading}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    Pause {dur}
                  </button>
                ))}
              </div>
            </div>
          )}

          {deliveryPaused && (
            <button
              onClick={() => handleResume("delivery")}
              disabled={pauseLoading}
              className="mt-4 w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
            >
              Resume Delivery
            </button>
          )}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {scheduleRows.map((row) => (
          <div key={row.dayName} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
              <div className="xl:col-span-1">
                <p className="text-sm text-slate-500">Day</p>
                <p className="text-base font-bold text-slate-900">{row.dayName}</p>
              </div>

              <label className="block">
                <span className="text-sm text-slate-500">Open time</span>
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  value={row.openTime}
                  disabled={row.isClosed}
                  onChange={(e) => updateRow(row.dayName, { openTime: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-500">Close time</span>
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  value={row.closeTime}
                  disabled={row.isClosed}
                  onChange={(e) => updateRow(row.dayName, { closeTime: e.target.value })}
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  checked={row.isClosed}
                  onChange={(e) => updateRow(row.dayName, { isClosed: e.target.checked })}
                />
                <span className="text-sm font-medium text-slate-700">Closed</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  checked={row.pickupEnabled}
                  disabled={row.isClosed}
                  onChange={(e) => updateRow(row.dayName, { pickupEnabled: e.target.checked })}
                />
                <span className="text-sm font-medium text-slate-700">Pickup</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  checked={row.deliveryEnabled}
                  disabled={row.isClosed}
                  onChange={(e) => updateRow(row.dayName, { deliveryEnabled: e.target.checked })}
                />
                <span className="text-sm font-medium text-slate-700">Delivery</span>
              </label>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={handleSaveAll}
          disabled={saveLoading}
          className="w-full sm:w-auto px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
        >
          {saveLoading ? "Saving..." : "Save All"}
        </button>
        {apiNotice ? <p className="text-sm text-amber-700">API notice: {apiNotice}</p> : null}
      </div>
    </div>
  );
}
