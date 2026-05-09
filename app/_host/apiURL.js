const normalizeUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");
};

const withHttpProtocol = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
};

const parseConfiguredUrl = (value) => {
  const normalized = withHttpProtocol(normalizeUrl(value));
  if (!normalized) return "";

  try {
    const parsed = new URL(normalized);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${pathname === "/" ? "" : pathname}`;
  } catch {
    return "";
  }
};

const API_ENV_VALUES = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
};

const pickConfiguredApi = () => {
  for (const [key, rawValue] of Object.entries(API_ENV_VALUES)) {
    const value = parseConfiguredUrl(rawValue);
    if (!value) continue;
    return { key, value };
  }

  return { key: "", value: "" };
};

const configured = pickConfiguredApi();
const developmentFallbackUrl =
  process.env.NODE_ENV === "development"
    ? "https://jomaasapi.onrender.com"
    : "https://jomaasapi.onrender.com";

const apiUrl = configured.value || developmentFallbackUrl;

export const apiConfig = {
  apiUrl,
  sourceKey:
    configured.key || (developmentFallbackUrl ? "development-fallback" : ""),
  sourceValue: configured.value || developmentFallbackUrl || "",
  isConfigured: !!(configured.value || developmentFallbackUrl),
  hasExplicitConfig: !!configured.value,
  usingDevelopmentFallback: !configured.value && !!developmentFallbackUrl,
};

const trimSlashes = (value) => value.replace(/^\/+/, "").replace(/\/+$/, "");

export const buildApiUrl = (path = "") => {
  if (!apiUrl) return "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const base = new URL(apiUrl);
  let basePath = trimSlashes(base.pathname || "");
  let endpointPath = trimSlashes(normalizedPath);

  if (basePath.endsWith("api/v1") && endpointPath.startsWith("api/v1/")) {
    endpointPath = endpointPath.replace(/^api\/v1\//, "");
  } else if (basePath === "api/v1" && endpointPath === "api/v1") {
    endpointPath = "";
  } else if (basePath.endsWith("api") && endpointPath.startsWith("api/")) {
    endpointPath = endpointPath.replace(/^api\//, "");
  } else if (basePath === "api" && endpointPath === "api") {
    endpointPath = "";
  }

  const joinedPath = [basePath, endpointPath].filter(Boolean).join("/");
  return `${base.origin}${joinedPath ? `/${joinedPath}` : ""}`;
};

export default apiUrl;
