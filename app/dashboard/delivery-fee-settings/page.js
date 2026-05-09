"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  createBlackout,
  deleteBlackout,
  fetchBlackouts,
  fetchDeliverySettings,
  parseApiErrorMessage,
  previewDeliveryPricing,
  updateBlackout,
  updateDeliverySettings,
} from "../_utils/deliveryPricingApi";
import { apiConfig } from "@/app/_host/apiURL";

const previewSubtotals = [38, 40, 57];
const dayOptions = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export default function DeliveryFeeSettingsPage() {
  const user = useSelector((state) => state.userData.userInfo);
  const branch = user?.branchName || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    normalDeliveryFee: 5,
    deliveryRadiusKm: 7,
    deliveryEnabled: true,
    timezone: "America/Edmonton",
  });
  const [normalFeeInput, setNormalFeeInput] = useState("5");
  const [radiusInput, setRadiusInput] = useState("7");
  const [blackouts, setBlackouts] = useState([]);
  const [blackoutSaving, setBlackoutSaving] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({
    day: "monday",
    start: "",
    end: "",
    reason: "Delivery is unavailable.",
    status: "active",
  });
  const [previews, setPreviews] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [next, blackoutRows] = await Promise.all([
        fetchDeliverySettings(branch),
        fetchBlackouts(branch),
      ]);
      setSettings(next);
      setNormalFeeInput(String(next.normalDeliveryFee ?? 0));
      setRadiusInput(String(next.deliveryRadiusKm ?? 7));
      setBlackouts(blackoutRows);
    } catch (error) {
      toast.error(
        parseApiErrorMessage(
          error,
          "Failed to load delivery settings from backend.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleBlackoutStatus = async (item) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    const isActive = nextStatus === "active";
    setBlackoutSaving(true);
    try {
      await updateBlackout(
        item.id,
        {
          status: nextStatus,
          active: isActive,
          isActive,
          enabled: isActive,
          disabled: !isActive,
          day: item.day,
        },
        branch,
      );
      setBlackouts(await fetchBlackouts(branch));
      toast.success(`Delivery blackout ${nextStatus}.`);
    } catch (error) {
      toast.error(parseApiErrorMessage(error, "Failed to update blackout."));
    } finally {
      setBlackoutSaving(false);
    }
  };

  const loadPreviews = async () => {
    setPreviewLoading(true);
    try {
      const results = await Promise.all(
        previewSubtotals.map((subtotal) =>
          previewDeliveryPricing({
            branch,
            serviceType: "delivery",
            subtotalBeforeTax: subtotal,
          }).then((data) => ({ subtotal, data })),
        ),
      );
      setPreviews(results);
    } catch (error) {
      toast.error(
        parseApiErrorMessage(error, "Failed to load delivery pricing preview."),
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadPreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  const parsedNormalFee = useMemo(() => Number(normalFeeInput), [normalFeeInput]);
  const parsedRadius = useMemo(() => Number(radiusInput), [radiusInput]);
  const validationErrors = useMemo(() => {
    const errors = [];
    if (Number.isNaN(parsedNormalFee) || parsedNormalFee < 0) {
      errors.push("Normal delivery fee must be a non-negative number.");
    }
    if (Number.isNaN(parsedRadius) || parsedRadius <= 0) {
      errors.push("Delivery radius must be greater than 0 km.");
    }
    return errors;
  }, [parsedNormalFee, parsedRadius]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(" • "));
      return;
    }
    setSaving(true);
    try {
      const next = await updateDeliverySettings({
        branch,
        normalDeliveryFee: parsedNormalFee,
        deliveryRadiusKm: parsedRadius,
        deliveryEnabled: settings.deliveryEnabled,
      });
      setSettings(next);
      setNormalFeeInput(String(next.normalDeliveryFee ?? 0));
      setRadiusInput(String(next.deliveryRadiusKm ?? 7));
      toast.success("Delivery settings saved.");
      await loadPreviews();
    } catch (error) {
      toast.error(
        parseApiErrorMessage(error, "Failed to save delivery settings."),
      );
    } finally {
      setSaving(false);
    }
  };

  const addBlackout = async (e) => {
    e.preventDefault();
    if (!blackoutForm.day || !blackoutForm.start || !blackoutForm.end) {
      toast.error("Choose a day, start time, and end time.");
      return;
    }
    setBlackoutSaving(true);
    try {
      await createBlackout({
        branch,
        ...blackoutForm,
      });
      setBlackouts(await fetchBlackouts(branch));
      setBlackoutForm((prev) => ({ ...prev, start: "", end: "" }));
      toast.success("Delivery blackout added.");
    } catch (error) {
      toast.error(parseApiErrorMessage(error, "Failed to add blackout."));
    } finally {
      setBlackoutSaving(false);
    }
  };

  const removeBlackout = async (id) => {
    setBlackoutSaving(true);
    try {
      await deleteBlackout(id, branch);
      setBlackouts((prev) => prev.filter((item) => item.id !== id));
      toast.success("Delivery blackout removed.");
    } catch (error) {
      toast.error(parseApiErrorMessage(error, "Failed to remove blackout."));
    } finally {
      setBlackoutSaving(false);
    }
  };

  return (
    <div className="w-full pt-[80px] p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-5 md:p-7">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-p-red">
              Delivery Fee Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Backend-driven normal delivery fee. Pickup orders always use $0.00.
            </p>
          </div>
          <Link
            href="/dashboard/delivery-promotions"
            className="rounded-md border border-p-red text-p-red px-4 py-2 text-sm font-semibold hover:bg-p-red hover:text-white"
          >
            Manage Free Delivery Promotions →
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-2 break-all">
          Backend API: {apiConfig.sourceValue || "Not configured"}{" "}
          {apiConfig.sourceKey ? `(source: ${apiConfig.sourceKey})` : ""}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading settings...</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-p-brown">
                Normal Delivery Fee ($)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="border rounded-md p-2"
                value={normalFeeInput}
                onChange={(e) => setNormalFeeInput(e.target.value)}
              />
              <span className="text-xs text-gray-500">
                Default: $5.00. This fee is applied whenever no free-delivery
                promotion is active or the customer doesn’t qualify.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-p-brown">
                Delivery Radius (km)
              </span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                className="border rounded-md p-2"
                value={radiusInput}
                onChange={(e) => setRadiusInput(e.target.value)}
              />
              <span className="text-xs text-gray-500">
                Customers outside this radius should be treated as unavailable by
                backend delivery checks.
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.deliveryEnabled !== false}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    deliveryEnabled: e.target.checked,
                  }))
                }
              />
              <span className="text-sm font-medium text-p-brown">
                Delivery service enabled
              </span>
            </label>

            {validationErrors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {validationErrors.map((error) => (
                  <p key={error}>• {error}</p>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
              <p>
                Current rule preview: Delivery fee is{" "}
                <strong>
                  {`$${Math.max(0, Number(parsedNormalFee) || 0).toFixed(2)} for delivery orders`}
                </strong>
                .
              </p>
              <p className="mt-1">Pickup delivery fee is always $0.00.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-p-red text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={() => {
                  loadConfig();
                  loadPreviews();
                }}
                disabled={saving}
                className="border border-gray-300 px-4 py-2 rounded-md text-sm"
              >
                Reload from backend
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-p-brown">
                Delivery blackouts
              </h2>
              <p className="text-xs text-gray-500">
                Block delivery windows from the backend schedule.
              </p>
            </div>
          </div>

          <form
            onSubmit={addBlackout}
            className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Day</span>
              <select
                className="border rounded-md p-2 text-sm"
                value={blackoutForm.day}
                onChange={(e) =>
                  setBlackoutForm((prev) => ({
                    ...prev,
                    day: e.target.value,
                  }))
                }
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day[0].toUpperCase() + day.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Start</span>
              <input
                type="time"
                className="border rounded-md p-2 text-sm"
                value={blackoutForm.start}
                onChange={(e) =>
                  setBlackoutForm((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">End</span>
              <input
                type="time"
                className="border rounded-md p-2 text-sm"
                value={blackoutForm.end}
                onChange={(e) =>
                  setBlackoutForm((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Status</span>
              <select
                className="border rounded-md p-2 text-sm"
                value={blackoutForm.status}
                onChange={(e) =>
                  setBlackoutForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Reason</span>
              <input
                className="border rounded-md p-2 text-sm"
                value={blackoutForm.reason}
                onChange={(e) =>
                  setBlackoutForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
              />
            </label>
            <button
              type="submit"
              disabled={blackoutSaving || loading}
              className="bg-p-red text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 md:col-span-5"
            >
              {blackoutSaving ? "Saving..." : "Add Blackout"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {blackouts.length === 0 ? (
              <p className="text-sm text-gray-500">
                No delivery blackout windows are configured.
              </p>
            ) : (
              blackouts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-gray-200 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-p-brown">
                      {item.day[0]?.toUpperCase() + item.day.slice(1)}{" "}
                      {item.start} - {item.end}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.reason || "Delivery unavailable"} ·{" "}
                      {item.status || "active"} · delivery only
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={blackoutSaving}
                      onClick={() => toggleBlackoutStatus(item)}
                      className="border border-gray-300 text-gray-700 rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
                    >
                      {item.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={blackoutSaving}
                      onClick={() => removeBlackout(item.id)}
                      className="border border-red-200 text-red-700 rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview / Test widget */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-p-brown">
                Live pricing preview (subtotal before tax)
              </h2>
              <p className="text-xs text-gray-500">
                Threshold uses subtotal BEFORE tax. Reflects current settings + active promo.
              </p>
            </div>
            <button
              type="button"
              onClick={loadPreviews}
              disabled={previewLoading}
              className="text-sm border border-gray-300 px-3 py-1.5 rounded"
            >
              {previewLoading ? "Refreshing..." : "Refresh preview"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {previews.map(({ subtotal, data }) => (
              <div
                key={subtotal}
                className="rounded-md border border-gray-200 bg-white p-3"
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Subtotal
                </p>
                <p className="text-xl font-extrabold text-p-brown">
                  ${subtotal.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  Delivery fee:{" "}
                  <span
                    className={`font-bold ${data.effectiveDeliveryFee === 0 ? "text-green-700" : "text-p-red"}`}
                  >
                    ${data.effectiveDeliveryFee.toFixed(2)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {data.deliveryPromo?.isQualified
                    ? data.deliveryPromo.qualifiedBannerMessage
                    : data.deliveryPromo?.unqualifiedMessage ||
                      data.bannerMessage ||
                      "No promo banner."}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  {data.isPromoActive
                    ? `Promo active${data.isWithinSchedule ? "" : " (outside schedule)"}`
                    : "No active promotion"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
