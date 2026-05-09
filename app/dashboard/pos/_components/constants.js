export const TAX_RATE = 0.05;

// Extra topping surcharge per size (flat across all pizzas).
// Falls back to DEFAULT when a size key isn't matched.
export const TOPPING_PRICE_BY_SIZE = {
  small: 1.0,
  medium: 1.5,
  large: 2.0,
  extralarge: 2.5,
};
export const DEFAULT_TOPPING_PRICE = 1.5;

export const getToppingPrice = (sizeKey) => {
  if (!sizeKey) return DEFAULT_TOPPING_PRICE;
  const k = String(sizeKey).toLowerCase().replace(/[\s_-]/g, "");
  return TOPPING_PRICE_BY_SIZE[k] ?? DEFAULT_TOPPING_PRICE;
};

// Manager PIN thresholds for discount approval.
// Discounts meeting or exceeding either threshold require the PIN.
export const DISCOUNT_PIN_PERCENT = 20; // % off >= this requires PIN
export const DISCOUNT_PIN_AMOUNT = 20; // $ off >= this requires PIN
// Default PIN; override in production via NEXT_PUBLIC_POS_MANAGER_PIN.
export const MANAGER_PIN =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NEXT_PUBLIC_POS_MANAGER_PIN) ||
  "1234";

export const CATEGORIES = [
  { key: "pizza", label: "Pizza", emoji: "\uD83C\uDF55" },
  { key: "two-for-one-pizzas", label: "2 for 1", emoji: "\uD83C\uDF55" },
  { key: "donair", label: "Donair", emoji: "\uD83C\uDF2F" },
  { key: "wings", label: "Wings", emoji: "\uD83C\uDF57" },
  { key: "poutines", label: "Poutines", emoji: "\uD83C\uDF5F" },
  { key: "chicken", label: "Chicken", emoji: "\uD83C\uDF57" },
  { key: "panzarotti", label: "Panzarotti", emoji: "\uD83E\uDD5F" },
  { key: "garlic-fingers", label: "Garlic Fingers", emoji: "\uD83E\uDDC4" },
  { key: "burgers", label: "Burgers", emoji: "\uD83C\uDF54" },
  { key: "salads", label: "Salads", emoji: "\uD83E\uDD57" },
  { key: "speciality-pasta", label: "Pasta", emoji: "\uD83C\uDF5D" },
  { key: "sub", label: "Subs", emoji: "\uD83E\uDD6A" },
  { key: "beverages", label: "Drinks", emoji: "\uD83E\uDD64" },
  { key: "sauce", label: "Sauce", emoji: "\uD83E\uDD43" },
];

export const getItemPrice = (item) => {
  if (item.prices && typeof item.prices === "object") {
    return (
      Number(item.prices.large) ||
      Number(item.prices.medium) ||
      Number(item.prices.small) ||
      0
    );
  }
  return Number(item.prices) || Number(item.pricing) || Number(item.price) || 0;
};

export const getItemSizeLabel = (item) => {
  if (item.prices && typeof item.prices === "object") {
    if (item.prices.large) return "Large";
    if (item.prices.medium) return "Medium";
    if (item.prices.small) return "Small";
  }
  return "";
};
