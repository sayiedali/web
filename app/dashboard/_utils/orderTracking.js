export const ORDER_TRACKING_STATUS = {
  ORDER_PLACED: "order_placed",
  ACCEPTED_BY_STORE: "accepted_by_store",
  PREPARING: "preparing",
  READY_FOR_PICKUP: "ready_for_pickup",
  PICKED_UP: "picked_up",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  REJECTED: "rejected",
};

const PICKUP_FLOW = [
  ORDER_TRACKING_STATUS.ORDER_PLACED,
  ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE,
  ORDER_TRACKING_STATUS.PREPARING,
  ORDER_TRACKING_STATUS.READY_FOR_PICKUP,
  ORDER_TRACKING_STATUS.PICKED_UP,
];

const DELIVERY_FLOW = [
  ORDER_TRACKING_STATUS.ORDER_PLACED,
  ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE,
  ORDER_TRACKING_STATUS.PREPARING,
  ORDER_TRACKING_STATUS.OUT_FOR_DELIVERY,
  ORDER_TRACKING_STATUS.DELIVERED,
];

const LABEL_BY_STATUS = {
  [ORDER_TRACKING_STATUS.ORDER_PLACED]: "Order Placed",
  [ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE]: "Accepted by Store",
  [ORDER_TRACKING_STATUS.PREPARING]: "Preparing",
  [ORDER_TRACKING_STATUS.READY_FOR_PICKUP]: "Ready for Pickup",
  [ORDER_TRACKING_STATUS.PICKED_UP]: "Picked Up",
  [ORDER_TRACKING_STATUS.OUT_FOR_DELIVERY]: "Out for Delivery",
  [ORDER_TRACKING_STATUS.DELIVERED]: "Delivered",
  [ORDER_TRACKING_STATUS.REJECTED]: "Rejected",
};

const LEGACY_STATUS_MAP = {
  pending: ORDER_TRACKING_STATUS.ORDER_PLACED,
  accepted: ORDER_TRACKING_STATUS.ACCEPTED_BY_STORE,
  preparing: ORDER_TRACKING_STATUS.PREPARING,
  reject: ORDER_TRACKING_STATUS.REJECTED,
  rejected: ORDER_TRACKING_STATUS.REJECTED,
};

export const getFlowByService = (service) =>
  service === "pickup" ? PICKUP_FLOW : DELIVERY_FLOW;

export const normalizeOrderStatus = (order) => {
  const rawStatus = `${order?.orderStatus || ""}`.trim().toLowerCase();

  if (LEGACY_STATUS_MAP[rawStatus]) {
    return LEGACY_STATUS_MAP[rawStatus];
  }

  if (rawStatus === "ready") {
    return order?.service === "pickup"
      ? ORDER_TRACKING_STATUS.READY_FOR_PICKUP
      : ORDER_TRACKING_STATUS.OUT_FOR_DELIVERY;
  }

  if (rawStatus === "delivered") {
    return order?.service === "pickup"
      ? ORDER_TRACKING_STATUS.PICKED_UP
      : ORDER_TRACKING_STATUS.DELIVERED;
  }

  if (Object.values(ORDER_TRACKING_STATUS).includes(rawStatus)) {
    return rawStatus;
  }

  return ORDER_TRACKING_STATUS.ORDER_PLACED;
};

export const getStatusLabel = (status) =>
  LABEL_BY_STATUS[status] || "Order Placed";

export const getTypeLabel = (service) =>
  service === "pickup" ? "Pickup" : "Delivery";

export const getNextStatus = (order) => {
  const flow = getFlowByService(order?.service);
  const currentStatus = normalizeOrderStatus(order);
  const index = flow.indexOf(currentStatus);

  if (index === -1 || index === flow.length - 1) {
    return null;
  }

  return flow[index + 1];
};

export const getStatusHistory = (order) => {
  const flow = getFlowByService(order?.service);
  const currentStatus = normalizeOrderStatus(order);
  const currentIndex = flow.indexOf(currentStatus);

  return flow.map((status, index) => ({
    status,
    label: getStatusLabel(status),
    complete: index <= currentIndex,
    current: status === currentStatus,
  }));
};

const normalizeText = (value) => `${value || ""}`.trim().toLowerCase();

export const parseOrderArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.success?.data)) return payload.success.data;
  if (Array.isArray(payload?.success?.orders)) return payload.success.orders;
  return [];
};

export const matchesBranch = (order, branch) => {
  const selectedBranch = normalizeText(branch);
  if (!selectedBranch) return true;
  const orderBranch = normalizeText(order?.branch);
  return !orderBranch || orderBranch === selectedBranch;
};

export const matchesOrderType = (order, expectedType) => {
  if (!expectedType) return true;
  const expected = normalizeText(expectedType);
  const orderType = normalizeText(order?.orderType || order?.type);
  if (!orderType) return true;
  return orderType === expected;
};

export const matchesOrderCondition = (order, expectedCondition) => {
  if (!expectedCondition) return true;
  const expected = normalizeText(expectedCondition);
  const condition = normalizeText(order?.orderCondition || order?.condition);
  const status = normalizeOrderStatus(order);

  if (!condition) {
    if (expected === "pending") {
      return status === ORDER_TRACKING_STATUS.ORDER_PLACED;
    }
    if (expected === "approved") {
      return status !== ORDER_TRACKING_STATUS.ORDER_PLACED && status !== ORDER_TRACKING_STATUS.REJECTED;
    }
    if (expected === "reject") {
      return status === ORDER_TRACKING_STATUS.REJECTED;
    }
    return true;
  }

  if (expected === "reject") {
    return condition === "reject" || condition === "rejected";
  }

  return condition === expected;
};

export const buildOrderStatusPayload = (id, orderStatus, orderCondition) => ({
  id,
  orderStatus,
  ...(orderCondition ? { orderCondition } : {}),
});
