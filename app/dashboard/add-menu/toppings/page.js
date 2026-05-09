"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Input } from "antd";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;

const initialForm = {
  name: "",
  code: "",
  description: "",
  extraPrice: "",
  sortOrder: "",
};

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

const buildPayload = (formData, branch) => ({
  name: formData.name.trim(),
  code: formData.code.trim().toUpperCase(),
  description: formData.description.trim(),
  extraPrice: formData.extraPrice ? Number(formData.extraPrice) : 0,
  sortOrder: formData.sortOrder ? Number(formData.sortOrder) : 0,
  branch,
  status: "available",
  isAvailable: "available",
  isActive: true,
});

const requestWithEndpointFallback = async (method, endpoints, data) => {
  let lastError;

  for (const endpoint of endpoints) {
    try {
      if (method === "get") {
        const response = await axios.get(
          `${apiUrl}/api/v1/add-menu/${endpoint}`,
          {
            auth: { username: "user", password: getToken },
          },
        );
        return response;
      }

      const response = await axios.post(
        `${apiUrl}/api/v1/add-menu/${endpoint}`,
        data,
        {
          auth: { username: "user", password: postToken },
        },
      );
      return response;
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Unable to resolve API endpoint.");
};

const ToppingsListSection = ({
  title,
  items,
  onEdit,
  onToggle,
  toggleLabel,
  toggleClass,
  disabled,
}) => {
  return (
    <div className="w-full">
      <h4 className="text-p-red font-semibold text-[18px] mb-3">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-p-brown bg-white rounded-md p-3">
          No toppings here yet.
        </p>
      ) : (
        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="w-full md:w-[32%] bg-p-yellow p-4 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[18px] text-p-red font-semibold uppercase">
                  {item.name}
                </h4>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    isToppingActive(item)
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {isToppingActive(item) ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <p className="text-xs text-p-brown mt-1">
                Code: {item.code || "N/A"}
              </p>
              <p className="text-sm text-p-brown mt-2">
                {item.description || "No description"}
              </p>
              <p className="text-sm text-p-brown mt-2">
                Extra Price: ${item.extraPrice || 0}
              </p>
              <p className="text-sm text-p-brown">
                Sort Order: {item.sortOrder || 0}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                <div
                  onClick={() => onEdit(item)}
                  className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-green-700"
                >
                  Edit
                </div>
                <div
                  onClick={() => !disabled && onToggle(item._id)}
                  className={`p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] ${toggleClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {toggleLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ToppingsManagerPage = () => {
  const data = useSelector((state) => state);
  const branch = data.userData.userInfo && data.userData.userInfo.branchName;

  const [formData, setFormData] = useState(initialForm);
  const [toppings, setToppings] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });

  const branchScopedToppings = useMemo(
    () => toppings.filter((item) => isBranchMatch(item, branch)),
    [toppings, branch],
  );

  const activeToppings = useMemo(
    () => branchScopedToppings.filter((item) => isToppingActive(item)),
    [branchScopedToppings],
  );

  const inactiveToppings = useMemo(
    () => branchScopedToppings.filter((item) => !isToppingActive(item)),
    [branchScopedToppings],
  );

  const clearStatus = () => {
    setStatusMessage({ type: "", message: "" });
  };

  const handleFieldChange = (value, field) => {
    clearStatus();
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setIsEdit(false);
    setEditId("");
  };

  const fetchToppings = async () => {
    setLoadingList(true);
    try {
      const res = await requestWithEndpointFallback("get", [
        "gettoppings",
        "gettopping",
      ]);
      setToppings(extractArrayPayload(res.data));
    } catch (error) {
      toast.error("Unable to load toppings list.");
      setStatusMessage({
        type: "error",
        message: "Unable to load toppings list from API.",
      });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchToppings();
  }, [refresh]);

  const hasDuplicateName = (name) => {
    const normalized = normalizeText(name);
    return branchScopedToppings.some(
      (item) => normalizeText(item.name) === normalized && item._id !== editId,
    );
  };

  const createTopping = async () => {
    clearStatus();

    if (!formData.name.trim()) {
      setStatusMessage({ type: "error", message: "Topping name is required." });
      return;
    }

    if (hasDuplicateName(formData.name)) {
      setStatusMessage({
        type: "error",
        message: "A topping with this name already exists for this branch.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(formData, branch);
      const res = await requestWithEndpointFallback(
        "post",
        ["toppings", "topping"],
        payload,
      );
      const message = res?.data?.message || "Topping created successfully.";
      toast.success(message);
      setStatusMessage({ type: "success", message });
      resetForm();
      setRefresh((prev) => !prev);
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message || "Error creating topping.";
      toast.error(apiMessage);
      setStatusMessage({ type: "error", message: apiMessage });
    } finally {
      setSaving(false);
    }
  };

  const updateTopping = async () => {
    clearStatus();
    if (!editId) return;

    if (!formData.name.trim()) {
      setStatusMessage({ type: "error", message: "Topping name is required." });
      return;
    }

    if (hasDuplicateName(formData.name)) {
      setStatusMessage({
        type: "error",
        message: "A topping with this name already exists for this branch.",
      });
      return;
    }

    setSaving(true);
    try {
      const createShape = buildPayload(formData, branch);
      const { status, isAvailable, isActive, ...updatedTopping } = createShape;

      const payload = {
        id: editId,
        updatedTopping,
      };

      const res = await requestWithEndpointFallback(
        "post",
        ["updatetoppings", "updatetopping"],
        payload,
      );
      const message = res?.data?.message || "Topping updated successfully.";
      toast.success(message);
      setStatusMessage({ type: "success", message });
      resetForm();
      setRefresh((prev) => !prev);
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message || "Error updating topping.";
      toast.error(apiMessage);
      setStatusMessage({ type: "error", message: apiMessage });
    } finally {
      setSaving(false);
    }
  };

  const setToppingStatus = async (id, activate) => {
    clearStatus();
    setSaving(true);
    try {
      await requestWithEndpointFallback(
        "post",
        ["toppingsstatus", "toppingstatus"],
        {
          id,
          status: activate ? "available" : "not-available",
          isAvailable: activate ? "available" : "not-available",
          isActive: activate,
        },
      );
      const message = `Topping ${activate ? "activated" : "deactivated"}.`;
      toast.success(message);
      setStatusMessage({ type: "success", message });
      setRefresh((prev) => !prev);
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message || "Unable to update topping status.";
      toast.error(apiMessage);
      setStatusMessage({ type: "error", message: apiMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    clearStatus();
    setIsEdit(true);
    setEditId(item._id);
    setFormData({
      name: item.name || "",
      code: item.code || "",
      description: item.description || "",
      extraPrice: item.extraPrice?.toString?.() || "",
      sortOrder: item.sortOrder?.toString?.() || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="max-w-4xl mx-auto w-full bg-white shadow-sm rounded-xl p-4 md:p-6">
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          {isEdit ? "Update Topping" : "Create Topping"}
        </h3>

        {statusMessage.message && (
          <div
            className={`mb-3 rounded-md px-3 py-2 text-sm ${
              statusMessage.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {statusMessage.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Topping Name"
            value={formData.name}
            onChange={(e) => handleFieldChange(e.target.value, "name")}
          />
          <Input
            placeholder="Code (optional)"
            value={formData.code}
            onChange={(e) => handleFieldChange(e.target.value, "code")}
          />
          <Input
            placeholder="Extra Price (CAD)"
            type="number"
            value={formData.extraPrice}
            onChange={(e) => handleFieldChange(e.target.value, "extraPrice")}
          />
          <Input
            placeholder="Sort Order"
            type="number"
            value={formData.sortOrder}
            onChange={(e) => handleFieldChange(e.target.value, "sortOrder")}
          />
        </div>

        <Input.TextArea
          className="mt-3"
          placeholder="Description"
          value={formData.description}
          onChange={(e) => handleFieldChange(e.target.value, "description")}
        />

        <div className="flex justify-center gap-3 mt-4">
          {isEdit ? (
            <>
              <CommonButton
                title={saving ? "Updating..." : "Update"}
                onClick={updateTopping}
              />
              <CommonButton title="Cancel Edit" onClick={resetForm} />
            </>
          ) : (
            <CommonButton
              title={saving ? "Creating..." : "Create Topping"}
              onClick={createTopping}
            />
          )}
          <CommonButton title="Clear Status" onClick={clearStatus} />
        </div>
      </div>

      <div className="w-full">
        <div className="flex justify-between items-center gap-2 mb-3">
          <h3 className="uppercase font-semibold text-p-brown text-[18px]">
            Toppings Master List
          </h3>
          <button
            className="px-3 py-1 rounded bg-p-blue text-white text-sm"
            onClick={() => setRefresh((prev) => !prev)}
          >
            Refresh
          </button>
        </div>

        {loadingList ? (
          <p className="text-p-brown">Loading toppings...</p>
        ) : (
          <div className="flex flex-col gap-8">
            <ToppingsListSection
              title="Active Toppings"
              items={activeToppings}
              onEdit={handleEdit}
              onToggle={(id) => setToppingStatus(id, false)}
              toggleLabel="Deactivate"
              toggleClass="bg-p-red"
              disabled={saving}
            />

            <ToppingsListSection
              title="Inactive Toppings"
              items={inactiveToppings}
              onEdit={handleEdit}
              onToggle={(id) => setToppingStatus(id, true)}
              toggleLabel="Reactivate"
              toggleClass="bg-p-blue"
              disabled={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ToppingsManagerPage;
