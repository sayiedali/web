"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { apiConfig } from "@/app/_host/apiURL";
import {
  createPromotion,
  deletePromotion,
  fetchPromotions,
  parseApiErrorMessage,
  previewDeliveryPricing,
  updatePromotion,
  updatePromotionStatus,
} from "../_utils/deliveryPricingApi";

const DAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const STATUS_BADGE = {
  active: "bg-green-100 text-green-800 border-green-200",
  paused: "bg-yellow-100 text-yellow-800 border-yellow-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
};

const emptyForm = {
  name: "Free Delivery Promotion",
  status: "active",
  thresholdOrderAmountBeforeTax: "40",
  bannerMessage: "🎉 Enjoy your free delivery!",
  alwaysActive: true,
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  daysOfWeek: [],
  priority: "0",
};

const toIsoDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const promoToForm = (promo) => ({
  name: promo.name || "",
  status: promo.status || "inactive",
  thresholdOrderAmountBeforeTax: String(promo.thresholdOrderAmountBeforeTax ?? 0),
  bannerMessage: promo.bannerMessage || "",
  alwaysActive: promo.alwaysActive !== false,
  startDate: toIsoDateInput(promo.startDate),
  endDate: toIsoDateInput(promo.endDate),
  startTime: promo.startTime || "",
  endTime: promo.endTime || "",
  daysOfWeek: Array.isArray(promo.daysOfWeek) ? [...promo.daysOfWeek] : [],
  priority: String(promo.priority ?? 0),
});

const formToPayload = (form, branch) => {
  const payload = {
    name: String(form.name || "").trim(),
    type: "free_delivery",
    status: form.status,
    thresholdOrderAmountBeforeTax: Number(form.thresholdOrderAmountBeforeTax || 0),
    bannerMessage: String(form.bannerMessage || "").trim(),
    alwaysActive: Boolean(form.alwaysActive),
    daysOfWeek: form.alwaysActive ? [] : form.daysOfWeek,
    priority: Number(form.priority || 0),
  };
  payload.startDate = form.alwaysActive || !form.startDate
    ? null
    : new Date(form.startDate).toISOString();
  payload.endDate = form.alwaysActive || !form.endDate
    ? null
    : new Date(form.endDate).toISOString();
  payload.startTime = form.alwaysActive ? null : form.startTime || null;
  payload.endTime = form.alwaysActive ? null : form.endTime || null;
  if (branch) payload.branch = branch;
  return payload;
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function DeliveryPromotionsPage() {
  const user = useSelector((state) => state.userData.userInfo);
  const branch = user?.branchName || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [editingId, setEditingId] = useState(null); // null = new, string = editing
  const [form, setForm] = useState(emptyForm);
  const [previews, setPreviews] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadPromos = async () => {
    setLoading(true);
    try {
      const list = await fetchPromotions(branch);
      setPromotions(list);
    } catch (error) {
      toast.error(
        parseApiErrorMessage(error, "Failed to load delivery promotions."),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPreviews = async () => {
    setPreviewLoading(true);
    try {
      const subtotals = [38, 40, 57];
      const results = await Promise.all(
        subtotals.map((subtotal) =>
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
        parseApiErrorMessage(error, "Failed to load pricing preview."),
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
    loadPreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  const onCreateNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onEdit = (promo) => {
    setEditingId(promo.id);
    setForm(promoToForm(promo));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const validationErrors = useMemo(() => {
    const errors = [];
    if (!String(form.name || "").trim()) errors.push("Name is required.");
    const threshold = Number(form.thresholdOrderAmountBeforeTax);
    if (!Number.isFinite(threshold) || threshold < 0) {
      errors.push("Threshold must be a non-negative number.");
    }
    if (!form.alwaysActive) {
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        errors.push("End date must be after start date.");
      }
    }
    return errors;
  }, [form]);

  const onSave = async (e) => {
    e?.preventDefault();
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(" • "));
      return;
    }
    setSaving(true);
    try {
      const payload = formToPayload(form, branch);
      if (editingId) {
        await updatePromotion(editingId, payload);
        toast.success("Promotion updated.");
      } else {
        await createPromotion(payload);
        toast.success("Promotion created.");
      }
      await loadPromos();
      await loadPreviews();
      onCancel();
    } catch (error) {
      toast.error(parseApiErrorMessage(error, "Failed to save promotion."));
    } finally {
      setSaving(false);
    }
  };

  const onChangeStatus = async (promo, status) => {
    try {
      await updatePromotionStatus(promo.id, status);
      toast.success(`Promotion ${status}.`);
      await loadPromos();
      await loadPreviews();
    } catch (error) {
      toast.error(
        parseApiErrorMessage(error, "Failed to update promotion status."),
      );
    }
  };

  const onDelete = async (promo) => {
    if (!confirm(`Delete promotion "${promo.name}"?`)) return;
    try {
      await deletePromotion(promo.id);
      toast.success("Promotion deleted.");
      await loadPromos();
      await loadPreviews();
      if (editingId === promo.id) onCancel();
    } catch (error) {
      toast.error(parseApiErrorMessage(error, "Failed to delete promotion."));
    }
  };

  const toggleDay = (day) => {
    setForm((prev) => {
      const present = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: present
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day],
      };
    });
  };

  return (
    <div className="w-full pt-[80px] p-4">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-5 md:p-7">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-p-red">
              Free Delivery Promotions
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your free-delivery promo. Customers see live status and
              messaging in their cart and checkout based on these rules.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Threshold uses <strong>subtotal before tax</strong>. Backend is
              the source of truth — frontends only render its response.
            </p>
          </div>
          <Link
            href="/dashboard/delivery-fee-settings"
            className="rounded-md border border-p-red text-p-red px-4 py-2 text-sm font-semibold hover:bg-p-red hover:text-white"
          >
            ← Delivery Fee Settings
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-2 break-all">
          Backend API: {apiConfig.sourceValue || "Not configured"}{" "}
          {apiConfig.sourceKey ? `(source: ${apiConfig.sourceKey})` : ""}
        </p>

        {/* Form */}
        <form
          onSubmit={onSave}
          className="mt-6 rounded-lg border border-gray-200 p-4 bg-gray-50"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-p-brown">
              {editingId ? "Edit promotion" : "Create promotion"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-gray-500 underline"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-p-brown">Name</span>
              <input
                type="text"
                className="border rounded-md p-2"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-p-brown">Status</span>
              <select
                className="border rounded-md p-2 bg-white"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-p-brown">
                Threshold (subtotal before tax) $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="border rounded-md p-2"
                value={form.thresholdOrderAmountBeforeTax}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    thresholdOrderAmountBeforeTax: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-p-brown">Priority</span>
              <input
                type="number"
                step="1"
                className="border rounded-md p-2"
                value={form.priority}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, priority: e.target.value }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm font-medium text-p-brown">
                Banner message (shown to customer when qualified)
              </span>
              <input
                type="text"
                className="border rounded-md p-2"
                value={form.bannerMessage}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bannerMessage: e.target.value,
                  }))
                }
              />
            </label>

            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={form.alwaysActive}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    alwaysActive: e.target.checked,
                  }))
                }
              />
              <span className="text-sm font-medium text-p-brown">
                Always active (ignore date/time/day schedule)
              </span>
            </label>

            {!form.alwaysActive && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-p-brown">
                    Start date
                  </span>
                  <input
                    type="date"
                    className="border rounded-md p-2"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-p-brown">
                    End date
                  </span>
                  <input
                    type="date"
                    className="border rounded-md p-2"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-p-brown">
                    Start time (HH:mm, 24h)
                  </span>
                  <input
                    type="time"
                    className="border rounded-md p-2"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-p-brown">
                    End time (HH:mm, 24h)
                  </span>
                  <input
                    type="time"
                    className="border rounded-md p-2"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </label>
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-p-brown">
                    Days of week (leave empty for all days)
                  </span>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {DAYS.map((day) => {
                      const selected = form.daysOfWeek.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${selected ? "bg-p-red text-white border-p-red" : "bg-white text-p-brown border-gray-300"}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {validationErrors.map((error) => (
                <p key={error}>• {error}</p>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-p-red text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create promotion"}
            </button>
            {!editingId && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="border border-gray-300 px-4 py-2 rounded-md text-sm"
              >
                Reset
              </button>
            )}
          </div>
        </form>

        {/* List */}
        <div className="mt-8 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-p-brown">All promotions</h2>
          <button
            type="button"
            onClick={onCreateNew}
            className="text-sm bg-p-red text-white px-3 py-1.5 rounded-md"
          >
            + New
          </button>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-gray-500">Loading promotions...</p>
        ) : promotions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No promotions yet. Create one above to enable free delivery.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-p-brown">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Threshold</th>
                  <th className="text-left p-2">Schedule</th>
                  <th className="text-right p-2">Priority</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo.id} className="border-t">
                    <td className="p-2">
                      <p className="font-semibold">{promo.name}</p>
                      <p className="text-xs text-gray-500">
                        {promo.bannerMessage}
                      </p>
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${STATUS_BADGE[promo.status] || STATUS_BADGE.inactive}`}
                      >
                        {promo.status}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono">
                      ${Number(promo.thresholdOrderAmountBeforeTax).toFixed(2)}
                    </td>
                    <td className="p-2 text-xs text-gray-700">
                      {promo.alwaysActive ? (
                        <span>Always active</span>
                      ) : (
                        <div className="space-y-0.5">
                          <p>
                            {formatDate(promo.startDate)} →{" "}
                            {formatDate(promo.endDate)}
                          </p>
                          {(promo.startTime || promo.endTime) && (
                            <p>
                              {promo.startTime || "—"} – {promo.endTime || "—"}
                            </p>
                          )}
                          {promo.daysOfWeek.length > 0 && (
                            <p className="text-gray-500">
                              {promo.daysOfWeek.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-right">{promo.priority}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(promo)}
                          className="text-xs px-2 py-1 rounded border border-gray-300"
                        >
                          Edit
                        </button>
                        {promo.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => onChangeStatus(promo, "paused")}
                            className="text-xs px-2 py-1 rounded border border-yellow-400 text-yellow-700"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onChangeStatus(promo, "active")}
                            className="text-xs px-2 py-1 rounded border border-green-500 text-green-700"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(promo)}
                          className="text-xs px-2 py-1 rounded border border-red-400 text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Live preview */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-p-brown">
                Live customer preview
              </h2>
              <p className="text-xs text-gray-500">
                What customers will see right now for these subtotals.
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
                <p className="mt-1 text-xs text-gray-600 min-h-[2em]">
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
