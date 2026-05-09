import axios from "axios";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;

const readAuth = { auth: { username: "user", password: getToken } };
const writeAuth = { auth: { username: "user", password: postToken } };

export const couponTypeOptions = [
  { value: "percentage", label: "Percentage discount" },
  { value: "fixed", label: "Fixed discount" },
];

export const couponDayOptions = [
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
  { value: "Sun", label: "Sunday" },
];

const normalizeType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("fixed")) return "fixed";
  return "percentage";
};

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.success?.data)) return payload.success.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const extractObjectPayload = (payload) => {
  if (payload?.success?.data && !Array.isArray(payload.success.data)) return payload.success.data;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  if (payload?.result && !Array.isArray(payload.result)) return payload.result;
  if (payload?.item && !Array.isArray(payload.item)) return payload.item;
  return null;
};


const normalizeIdPayload = (id) => ({
  id,
  _id: id,
  couponId: id,
});

const parseApiErrorMessage = (error, fallbackMessage = "Request failed.") => {
  const payload = error?.response?.data;
  const validationErrors = payload?.errors || payload?.error?.errors || payload?.validationErrors;

  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors
      .map((item) => item?.message || item?.msg || item?.field)
      .filter(Boolean)
      .join(" • ");
  }

  if (validationErrors && typeof validationErrors === "object") {
    const flatMessages = Object.values(validationErrors)
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .map((item) => (typeof item === "string" ? item : item?.message || item?.msg || ""))
      .filter(Boolean);

    if (flatMessages.length) return flatMessages.join(" • ");
  }

  return (
    payload?.message
    || payload?.error?.message
    || payload?.success?.message
    || error?.message
    || fallbackMessage
  );
};

const parseApiValidationErrors = (error) => {
  const payload = error?.response?.data || {};
  const sourceErrors = payload?.errors || payload?.error?.errors || payload?.validationErrors;
  const fieldErrors = {};
  const generalErrors = [];

  const pushGeneral = (message) => {
    if (!message || typeof message !== "string") return;
    if (!generalErrors.includes(message)) generalErrors.push(message);
  };

  const assignField = (rawField, message) => {
    const normalized = String(rawField || "").trim();
    if (!normalized) {
      pushGeneral(message);
      return;
    }

    const fieldAliasMap = {
      name: "name",
      couponName: "name",
      title: "name",
      code: "code",
      couponCode: "code",
      couponType: "couponType",
      discountType: "couponType",
      discountValue: "discountValue",
      discountRate: "discountValue",
      startDate: "startDate",
      endDate: "endDate",
      expiredDate: "endDate",
      availableDays: "availableDays",
      days: "availableDays",
      validDays: "availableDays",
      minimumOrderAmount: "minimumOrderAmount",
      minOrder: "minimumOrderAmount",
      usageLimit: "usageLimit",
      maxUsage: "usageLimit",
      perCustomerLimit: "perCustomerLimit",
      maxUsagePerCustomer: "perCustomerLimit",
      branch: "branch",
      branchName: "branch",
      notes: "notes",
      description: "notes",
      appliesTo: "appliesTo",
      serviceMode: "appliesTo",
    };

    const formField = fieldAliasMap[normalized];
    if (formField) {
      if (!fieldErrors[formField]) fieldErrors[formField] = message;
      return;
    }

    pushGeneral(`${normalized}: ${message}`);
  };

  if (Array.isArray(sourceErrors)) {
    sourceErrors.forEach((item) => {
      const message = item?.message || item?.msg || item?.error;
      const field = item?.field || item?.path || item?.param;
      if (field) assignField(field, message || "Invalid value.");
      else pushGeneral(message);
    });
  } else if (sourceErrors && typeof sourceErrors === "object") {
    Object.entries(sourceErrors).forEach(([field, value]) => {
      const normalizedMessages = (Array.isArray(value) ? value : [value])
        .map((item) => (typeof item === "string" ? item : item?.message || item?.msg || item?.error))
        .filter(Boolean);
      if (!normalizedMessages.length) return;
      assignField(field, normalizedMessages.join(" • "));
    });
  }

  if (!generalErrors.length) {
    const fallback = parseApiErrorMessage(error, "");
    if (fallback) pushGeneral(fallback);
  }

  return {
    fieldErrors,
    message: generalErrors.join(" • "),
  };
};

const requestWithFallback = async ({ method, endpoints, data }) => {
  let lastError;

  for (const endpoint of endpoints) {
    try {
      if (method === "get") {
        return await axios.get(`${apiUrl}/api/v1/${endpoint}`, readAuth);
      }

      return await axios.post(`${apiUrl}/api/v1/${endpoint}`, data, writeAuth);
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) throw error;
    }
  }

  throw lastError || new Error("No available endpoint for coupon API.");
};

const readDays = (coupon) => {
  const values = coupon?.availableDays || coupon?.days || coupon?.validDays || [];
  if (!Array.isArray(values)) return [];
  return values;
};

const readCouponActive = (coupon) => {
  if (typeof coupon?.isActive === "boolean") return coupon.isActive;
  if (typeof coupon?.active === "boolean") return coupon.active;
  if (typeof coupon?.status === "boolean") return coupon.status;
  if (typeof coupon?.messageStatus === "boolean") return coupon.messageStatus;
  return false;
};

const readAppliesTo = (coupon) => {
  const rawValue = coupon?.appliesTo || coupon?.serviceMode || "both";
  return String(rawValue).toLowerCase();
};

const formatDiscount = (type, value) => {
  const normalizedType = normalizeType(type);
  const numberValue = Number(value || 0);
  if (normalizedType === "percentage") return `${numberValue}%`;
  return `$${numberValue}`;
};

export const couponApi = {
  readDays,
  readCouponActive,
  readAppliesTo,
  formatDiscount,
  parseApiErrorMessage,
  parseApiValidationErrors,

  async listCoupons() {
    const res = await requestWithFallback({ method: "get", endpoints: ["coupon/all", "coupons/all", "coupons"] });
    return extractArrayPayload(res.data);
  },

  async fetchCouponById(id) {
    const fetchSingle = await requestWithFallback({ method: "get", endpoints: [`coupon/${id}`, `coupons/${id}`, `coupon/id/${id}`] }).catch(() => null);
    const single = fetchSingle ? extractObjectPayload(fetchSingle.data) : null;
    if (single) return single;
    const list = await this.listCoupons();
    return list.find((item) => item._id === id || item.id === id) || null;
  },

  async createCoupon(payload) {
    return requestWithFallback({
      method: "post",
      endpoints: ["coupon/create", "coupons/create"],
      data: {
        ...payload,
        createPayload: payload,
        coupon: payload,
        createCoupon: payload,
        data: payload,
      },
    });
  },

  async updateCoupon(id, payload) {
    const idPayload = normalizeIdPayload(id);
    return requestWithFallback({
      method: "post",
      endpoints: ["coupon/update", "coupons/update"],
      data: {
        ...payload,
        ...idPayload,
        updatedCoupon: payload,
        updatePayload: payload,
        coupon: payload,
        updateCoupon: payload,
        update: payload,
        data: payload,
      },
    });
  },

  async setCouponStatus(id, isActive) {
    const idPayload = normalizeIdPayload(id);
    return requestWithFallback({
      method: "post",
      endpoints: ["coupon/status/update", "coupon/status", "coupons/status/update"],
      data: {
        ...idPayload,
        isActive,
        active: isActive,
        status: isActive,
        messageStatus: isActive,
      },
    });
  },

  async deleteCoupon(id) {
    const idPayload = normalizeIdPayload(id);
    return requestWithFallback({ method: "post", endpoints: ["coupon/destroy", "coupons/destroy", "coupon/delete"], data: idPayload });
  },
};
