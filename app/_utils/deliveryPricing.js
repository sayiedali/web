const toCurrencyNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

export const roundCurrency = (value) => {
  const parsed = toCurrencyNumber(value, 0);
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

export const normalizeDeliveryPricingConfig = (payload = {}) => {
  const source = payload?.deliveryPricing || payload?.config || payload?.data || payload || {};

  const normalDeliveryFee =
    source.normalDeliveryFee ??
    source.deliveryFee ??
    source.defaultDeliveryFee ??
    0;

  return {
    normalDeliveryFee: Math.max(0, roundCurrency(normalDeliveryFee)),
  };
};

export const validateDeliveryPricingPayload = (payload = {}) => {
  const normalized = normalizeDeliveryPricingConfig(payload);
  const errors = [];

  if (normalized.normalDeliveryFee < 0) {
    errors.push("Normal delivery fee cannot be negative.");
  }

  return {
    normalized,
    errors,
    isValid: errors.length === 0,
  };
};

export const deriveDeliveryPricing = ({
  serviceType,
  config,
}) => {
  const normalizedConfig = normalizeDeliveryPricingConfig(config);

  const isDelivery = serviceType === "delivery";

  return {
    ...normalizedConfig,
    deliveryFee: isDelivery ? normalizedConfig.normalDeliveryFee : 0,
    applies: isDelivery,
  };
};
