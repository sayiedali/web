"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import apiUrl from "@/app/_host/apiURL";

const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;

const normalizeText = (value) => `${value || ""}`.trim().toLowerCase();

const isBranchMatch = (item, branch) => {
  const itemBranch = normalizeText(item?.branch);
  const selectedBranch = normalizeText(branch);

  if (!selectedBranch) return true;
  if (!itemBranch) return true;
  return itemBranch === selectedBranch;
};

const isToppingActive = (item) => {
  if (typeof item?.isActive === "boolean") return item.isActive;

  const availability = normalizeText(item?.isAvailable);
  if (availability) return availability !== "not-available";

  const status = normalizeText(item?.status);
  if (!status) return true;

  return !["inactive", "not-available", "disabled", "deactivated"].includes(
    status,
  );
};

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const dedupeValues = (values) =>
  Array.from(
    new Set(values.map((value) => `${value || ""}`.trim()).filter(Boolean)),
  );

const fetchToppingsFromAPI = async () => {
  const endpoints = ["gettoppings", "gettopping"];

  for (const endpoint of endpoints) {
    try {
      const res = await axios.get(`${apiUrl}/api/v1/add-menu/${endpoint}`, {
        auth: { username: "user", password: getToken },
      });

      const items = extractArrayPayload(res.data);
      if (items.length > 0) return items;

      if (Array.isArray(res.data)) return res.data;
    } catch (error) {
      if (error?.response?.status && error.response.status !== 404) {
        throw error;
      }
    }
  }

  return [];
};

const useToppingsOptions = ({ branch, fallback = [] }) => {
  const [toppingsMaster, setToppingsMaster] = useState([]);
  const [loadingToppings, setLoadingToppings] = useState(false);

  const refreshToppings = useCallback(async () => {
    setLoadingToppings(true);
    try {
      const data = await fetchToppingsFromAPI();
      setToppingsMaster(data);
    } catch (error) {
      setToppingsMaster([]);
    } finally {
      setLoadingToppings(false);
    }
  }, []);

  useEffect(() => {
    refreshToppings();
  }, [refreshToppings]);

  const toppingsOptions = useMemo(() => {
    const activeNames = toppingsMaster
      .filter((item) => isBranchMatch(item, branch))
      .filter((item) => isToppingActive(item))
      .map((item) => item?.name)
      .filter(Boolean);

    return activeNames.length > 0
      ? dedupeValues(activeNames)
      : dedupeValues(fallback);
  }, [toppingsMaster, branch, fallback]);

  return {
    toppingsOptions,
    toppingsMaster,
    loadingToppings,
    refreshToppings,
    isToppingActive,
    isBranchMatch,
  };
};

export default useToppingsOptions;
