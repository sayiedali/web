import axios from "axios";
import { buildApiUrl } from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;

const readAuth = { auth: { username: "user", password: getToken } };
const writeAuth = { auth: { username: "user", password: postToken } };

const toMoney = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

const extractPayload = (payload) =>
  payload?.success?.data || payload?.data || payload;

export const parseApiErrorMessage = (error, fallback = "Request failed.") => {
  const payload = error?.response?.data;
  const validationErrors =
    payload?.errors ||
    payload?.error?.errors ||
    payload?.error?.fieldErrors;
  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors
      .map((e) => e?.message || e?.field)
      .filter(Boolean)
      .join(" • ");
  }
  return (
    payload?.message ||
    payload?.error?.message ||
    error?.message ||
    fallback
  );
};

const apiGet = (path, config = {}) => {
  const url = buildApiUrl(path);
  if (!url) throw new Error("API URL not configured");
  return axios.get(url, { ...readAuth, ...config });
};

const apiPost = (path, data = {}, config = {}) => {
  const url = buildApiUrl(path);
  if (!url) throw new Error("API URL not configured");
  return axios.post(url, data, { ...writeAuth, ...config });
};

const apiPut = (path, data = {}, config = {}) => {
  const url = buildApiUrl(path);
  if (!url) throw new Error("API URL not configured");
  return axios.put(url, data, { ...writeAuth, ...config });
};

const apiPatch = (path, data = {}, config = {}) => {
  const url = buildApiUrl(path);
  if (!url) throw new Error("API URL not configured");
  return axios.patch(url, data, { ...writeAuth, ...config });
};

const apiDelete = (path, config = {}) => {
  const url = buildApiUrl(path);
  if (!url) throw new Error("API URL not configured");
  return axios.delete(url, { ...writeAuth, ...config });
};

const normalizeSettings = (raw = {}) => ({
  branch: raw?.branch || "default",
  normalDeliveryFee: toMoney(raw?.normalDeliveryFee, 5),
  defaultDeliveryFee: toMoney(
    raw?.defaultDeliveryFee ?? raw?.normalDeliveryFee,
    5,
  ),
  deliveryRadiusKm: toMoney(raw?.deliveryRadiusKm, 7),
  deliveryEnabled: raw?.deliveryEnabled !== false,
  timezone: raw?.timezone || "America/Edmonton",
  currency: raw?.currency || "CAD",
  updatedAt: raw?.updatedAt || null,
});

const normalizePromotion = (raw = {}) => ({
  id: raw?.id || raw?._id || "",
  branch: raw?.branch || "default",
  name: raw?.name || "",
  type: raw?.type || "free_delivery",
  status: raw?.status || "inactive",
  thresholdOrderAmountBeforeTax: toMoney(raw?.thresholdOrderAmountBeforeTax, 0),
  bannerMessage: raw?.bannerMessage || "🎉 Enjoy your free delivery!",
  alwaysActive: raw?.alwaysActive !== false,
  startDate: raw?.startDate || null,
  endDate: raw?.endDate || null,
  startTime: raw?.startTime || null,
  endTime: raw?.endTime || null,
  daysOfWeek: Array.isArray(raw?.daysOfWeek) ? raw.daysOfWeek : [],
  priority: Number.isFinite(Number(raw?.priority)) ? Number(raw.priority) : 0,
  createdAt: raw?.createdAt || null,
  updatedAt: raw?.updatedAt || null,
});

const normalizePricing = (raw = {}) => ({
  branch: raw?.branch || "default",
  serviceType: raw?.serviceType || "delivery",
  subtotalBeforeTax: toMoney(raw?.subtotalBeforeTax, 0),
  normalDeliveryFee: toMoney(raw?.normalDeliveryFee, 5),
  effectiveDeliveryFee: toMoney(raw?.effectiveDeliveryFee, 5),
  thresholdOrderAmountBeforeTax: toMoney(raw?.thresholdOrderAmountBeforeTax, 0),
  amountRemainingForFreeDelivery: toMoney(
    raw?.amountRemainingForFreeDelivery,
    0,
  ),
  isPromoActive: Boolean(raw?.isPromoActive),
  isWithinSchedule: Boolean(raw?.isWithinSchedule),
  isEligibleForFreeDelivery: Boolean(raw?.isEligibleForFreeDelivery),
  bannerMessage: raw?.bannerMessage || "",
  deliveryPromo: {
    isActive: Boolean(raw?.deliveryPromo?.isActive),
    isQualified: Boolean(raw?.deliveryPromo?.isQualified),
    thresholdAmount: toMoney(raw?.deliveryPromo?.thresholdAmount, 0),
    subtotalAmount: toMoney(raw?.deliveryPromo?.subtotalAmount, 0),
    remainingAmount: toMoney(raw?.deliveryPromo?.remainingAmount, 0),
    qualifiedBannerMessage: raw?.deliveryPromo?.qualifiedBannerMessage || "",
    unqualifiedMessage: raw?.deliveryPromo?.unqualifiedMessage || "",
    promoName: raw?.deliveryPromo?.promoName || raw?.promoName || "",
    promoId: raw?.deliveryPromo?.promoId || raw?.promoId || null,
  },
  promoId: raw?.promoId || null,
  promoName: raw?.promoName || "",
  pricingStatus: raw?.pricingStatus || "ready",
  blockingReason: raw?.blockingReason || null,
  timezone: raw?.timezone || "America/Edmonton",
});

const normalizeBlackoutStatus = (raw = {}) => {
  const status = String(raw?.status || "").trim().toLowerCase();
  if (raw?.disabled === true) return "inactive";
  if (raw?.active === false || raw?.isActive === false || raw?.enabled === false) {
    return "inactive";
  }
  if (raw?.active === true || raw?.isActive === true || raw?.enabled === true) {
    return "active";
  }
  if (["inactive", "paused", "disabled"].includes(status)) return "inactive";
  return "active";
};

// ===== Settings =====
export const fetchDeliverySettings = async (branch = "") => {
  const { data } = await apiGet("/api/v1/delivery/settings", {
    params: branch ? { branch } : undefined,
  });
  return normalizeSettings(extractPayload(data) || {});
};

export const updateDeliverySettings = async ({
  branch = "",
  normalDeliveryFee,
  defaultDeliveryFee,
  deliveryRadiusKm,
  deliveryEnabled,
}) => {
  const payload = {};
  if (normalDeliveryFee !== undefined && normalDeliveryFee !== null) {
    payload.normalDeliveryFee = toMoney(normalDeliveryFee, 0);
  }
  if (defaultDeliveryFee !== undefined && defaultDeliveryFee !== null) {
    payload.defaultDeliveryFee = toMoney(defaultDeliveryFee, 0);
  }
  if (deliveryRadiusKm !== undefined && deliveryRadiusKm !== null) {
    payload.deliveryRadiusKm = toMoney(deliveryRadiusKm, 0);
  }
  if (typeof deliveryEnabled === "boolean") {
    payload.deliveryEnabled = deliveryEnabled;
  }
  if (branch) payload.branch = branch;

  const { data } = await apiPut("/api/v1/delivery/settings", payload);
  return normalizeSettings(extractPayload(data) || {});
};

// ===== Promotions =====
export const fetchPromotions = async (branch = "") => {
  const { data } = await apiGet("/api/v1/delivery/promotions", {
    params: branch ? { branch } : undefined,
  });
  const list = extractPayload(data);
  return Array.isArray(list) ? list.map(normalizePromotion) : [];
};

export const fetchPromotion = async (id) => {
  const { data } = await apiGet(`/api/v1/delivery/promotions/${id}`);
  return normalizePromotion(extractPayload(data) || {});
};

export const createPromotion = async (payload) => {
  const { data } = await apiPost("/api/v1/delivery/promotions", payload);
  return normalizePromotion(extractPayload(data) || {});
};

export const updatePromotion = async (id, payload) => {
  const { data } = await apiPut(`/api/v1/delivery/promotions/${id}`, payload);
  return normalizePromotion(extractPayload(data) || {});
};

export const updatePromotionStatus = async (id, status) => {
  const { data } = await apiPatch(
    `/api/v1/delivery/promotions/${id}/status`,
    { status },
  );
  return normalizePromotion(extractPayload(data) || {});
};

export const deletePromotion = async (id) => {
  const { data } = await apiDelete(`/api/v1/delivery/promotions/${id}`);
  return extractPayload(data) || { id };
};

// ===== Delivery blackouts =====
const normalizeBlackout = (raw = {}) => ({
  id: raw?.id || raw?._id || "",
  branch: raw?.branch || "default",
  day: raw?.day || "",
  start: raw?.start || "",
  end: raw?.end || "",
  reason: raw?.reason || "",
  status: normalizeBlackoutStatus(raw),
  active: normalizeBlackoutStatus(raw) === "active",
  isActive: normalizeBlackoutStatus(raw) === "active",
  enabled: normalizeBlackoutStatus(raw) === "active",
  disabled: normalizeBlackoutStatus(raw) !== "active",
});

export const fetchBlackouts = async (branch = "") => {
  const { data } = await apiGet("/api/v1/delivery/blackouts", {
    params: branch ? { branch } : undefined,
  });
  const list = extractPayload(data);
  return Array.isArray(list) ? list.map(normalizeBlackout) : [];
};

export const createBlackout = async ({
  branch = "",
  day,
  start,
  end,
  reason,
  status = "active",
}) => {
  const normalizedStatus = normalizeBlackoutStatus({ status });
  const { data } = await apiPost("/api/v1/delivery/blackouts", {
    branch: branch || undefined,
    day,
    start,
    end,
    reason,
    status: normalizedStatus,
    active: normalizedStatus === "active",
    isActive: normalizedStatus === "active",
    enabled: normalizedStatus === "active",
    disabled: normalizedStatus !== "active",
  });
  return normalizeBlackout(extractPayload(data) || {});
};

export const updateBlackout = async (id, payload = {}, branch = "") => {
  const nextPayload = { ...payload };
  if (
    nextPayload.status !== undefined ||
    nextPayload.active !== undefined ||
    nextPayload.isActive !== undefined ||
    nextPayload.enabled !== undefined ||
    nextPayload.disabled !== undefined
  ) {
    const normalizedStatus = normalizeBlackoutStatus(nextPayload);
    nextPayload.status = normalizedStatus;
    nextPayload.active = normalizedStatus === "active";
    nextPayload.isActive = normalizedStatus === "active";
    nextPayload.enabled = normalizedStatus === "active";
    nextPayload.disabled = normalizedStatus !== "active";
  }
  const { data } = await apiPatch(`/api/v1/delivery/blackouts/${id}`, {
    ...nextPayload,
    branch: branch || undefined,
  });
  return extractPayload(data) || { id };
};

export const deleteBlackout = async (id, branch = "") => {
  const { data } = await apiDelete(`/api/v1/delivery/blackouts/${id}`, {
    data: branch ? { branch } : undefined,
  });
  return extractPayload(data) || { id };
};

// ===== Pricing preview (for the dashboard test widget) =====
export const previewDeliveryPricing = async ({
  branch = "",
  serviceType = "delivery",
  subtotalBeforeTax = 0,
}) => {
  const { data } = await apiPost("/api/v1/delivery/pricing/resolve", {
    branch: branch || undefined,
    serviceType,
    subtotalBeforeTax: toMoney(subtotalBeforeTax, 0),
  });
  return normalizePricing(extractPayload(data) || {});
};

// ===== Backwards-compat exports for older callers =====
export const fetchAdminDeliveryPricingConfig = async (branch = "") => {
  const settings = await fetchDeliverySettings(branch);
  return { normalDeliveryFee: settings.normalDeliveryFee };
};

export const updateAdminDeliveryPricingConfig = async ({
  branch = "",
  normalDeliveryFee,
}) => {
  const settings = await updateDeliverySettings({ branch, normalDeliveryFee });
  return { normalDeliveryFee: settings.normalDeliveryFee };
};

export const fetchCheckoutDeliveryPricingConfig = async ({ branch = "" } = {}) => {
  const settings = await fetchDeliverySettings(branch);
  return { normalDeliveryFee: settings.normalDeliveryFee };
};
