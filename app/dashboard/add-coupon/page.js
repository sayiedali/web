"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { DatePicker, Input, Modal, Popconfirm, Select, Switch } from "antd";
import { toast } from "react-toastify";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { couponApi, couponTypeOptions, couponDayOptions } from "./_utils/couponApi";

const appliesToOptions = [
  { label: "Pickup", value: "pickup" },
  { label: "Delivery", value: "delivery" },
  { label: "Both", value: "both" },
];

const defaultFilters = {
  status: "all",
  type: "all",
  code: "",
  branch: "all",
};

const emptyForm = {
  name: "",
  code: "",
  couponType: "percentage",
  discountValue: "",
  isActive: true,
  startDate: null,
  endDate: null,
  availableDays: [],
  minimumOrderAmount: "",
  appliesTo: "both",
  usageLimit: "",
  perCustomerLimit: "",
  branch: "",
  notes: "",
};

const normalizeCouponForForm = (coupon, defaultBranch) => ({
  name: coupon.name || coupon.couponName || coupon.title || "",
  code: coupon.code || coupon.couponCode || "",
  couponType: coupon.couponType || coupon.discountType || "percentage",
  discountValue: `${coupon.discountValue ?? coupon.discountRate ?? ""}`,
  isActive: couponApi.readCouponActive(coupon),
  startDate: coupon.startDate ? dayjs(coupon.startDate) : null,
  endDate: coupon.endDate || coupon.expiredDate ? dayjs(coupon.endDate || coupon.expiredDate) : null,
  availableDays: couponApi.readDays(coupon),
  minimumOrderAmount: `${coupon.minimumOrderAmount ?? coupon.minOrder ?? ""}`,
  appliesTo: couponApi.readAppliesTo(coupon),
  usageLimit: `${coupon.usageLimit ?? coupon.maxUsage ?? ""}`,
  perCustomerLimit: `${coupon.perCustomerLimit ?? coupon.maxUsagePerCustomer ?? ""}`,
  branch: coupon.branch || coupon.branchName || defaultBranch || "",
  notes: coupon.notes || coupon.description || "",
});

const CouponManagerPage = () => {
  const userBranch = useSelector((state) => state.userData.userInfo?.branchName || "");
  const [coupons, setCoupons] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  const [showModal, setShowModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, branch: userBranch || "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const loadCoupons = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await couponApi.listCoupons();
      setCoupons(list);
    } catch (error) {
      toast.error(couponApi.parseApiErrorMessage(error, "Unable to load coupons."));
      setCoupons([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const branchOptions = useMemo(() => {
    const discovered = new Set(coupons.map((item) => item.branch || item.branchName).filter(Boolean));
    if (userBranch) discovered.add(userBranch);
    return [...discovered];
  }, [coupons, userBranch]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const active = couponApi.readCouponActive(coupon);
      const type = (coupon.couponType || coupon.discountType || "").toLowerCase();
      const code = (coupon.code || coupon.couponCode || "").toLowerCase();
      const branch = coupon.branch || coupon.branchName || "";

      if (filters.status !== "all") {
        const shouldBeActive = filters.status === "active";
        if (active !== shouldBeActive) return false;
      }

      if (filters.type !== "all" && type !== filters.type) return false;
      if (filters.code && !code.includes(filters.code.toLowerCase().trim())) return false;
      if (filters.branch !== "all" && branch !== filters.branch) return false;

      return true;
    });
  }, [coupons, filters]);

  const valueHint = useMemo(() => {
    if (form.couponType === "percentage") return "Example: 20 means 20% discount.";
    return "Example: $5 off subtotal.";
  }, [form.couponType]);

  const openCreateModal = () => {
    setEditingCouponId("");
    setErrors({});
    setApiError("");
    setForm({ ...emptyForm, branch: userBranch || "" });
    setShowModal(true);
  };

  const openEditModal = async (coupon) => {
    const couponId = coupon._id || coupon.id;
    if (!couponId) {
      toast.error("Coupon id missing.");
      return;
    }

    setErrors({});
    setApiError("");
    setSaving(true);
    try {
      const details = await couponApi.fetchCouponById(couponId);
      const resolved = details || coupon;
      setEditingCouponId(couponId);
      setForm(normalizeCouponForForm(resolved, userBranch));
      setShowModal(true);
    } catch (error) {
      toast.error(couponApi.parseApiErrorMessage(error, "Unable to load coupon details."));
    } finally {
      setSaving(false);
    }
  };

  const updateFormValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setApiError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Coupon name is required.";
    if (!form.code.trim()) nextErrors.code = "Coupon code is required.";
    if (!form.couponType) nextErrors.couponType = "Coupon type is required.";

    const discountNumber = Number(form.discountValue);
    if (Number.isNaN(discountNumber) || discountNumber < 0) {
      nextErrors.discountValue = "Discount value must be a valid non-negative number.";
    }

    if (form.couponType === "percentage" && discountNumber > 100) {
      nextErrors.discountValue = "Percentage discount cannot exceed 100.";
    }

    if (!form.startDate) nextErrors.startDate = "Start date is required.";
    if (!form.endDate) nextErrors.endDate = "End date is required.";
    if (form.startDate && form.endDate && dayjs(form.endDate).isBefore(form.startDate)) {
      nextErrors.endDate = "End date must be after start date.";
    }

    if (!form.availableDays.length) {
      nextErrors.availableDays = "Select at least one available day.";
    }

    const minAmount = Number(form.minimumOrderAmount);
    if (Number.isNaN(minAmount) || minAmount < 0) {
      nextErrors.minimumOrderAmount = "Minimum order amount must be a valid non-negative number.";
    }

    if (form.usageLimit && (Number.isNaN(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) {
      nextErrors.usageLimit = "Usage limit must be a positive number.";
    }

    if (form.perCustomerLimit && (Number.isNaN(Number(form.perCustomerLimit)) || Number(form.perCustomerLimit) < 1)) {
      nextErrors.perCustomerLimit = "Per customer limit must be a positive number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => {
    const startDateISO = form.startDate ? dayjs(form.startDate).toISOString() : null;
    const endDateISO = form.endDate ? dayjs(form.endDate).toISOString() : null;
    const discountValue = Number(form.discountValue || 0);
    const minimumOrderAmount = Number(form.minimumOrderAmount || 0);
    const cleanedDays = form.availableDays.filter(Boolean);
    const cleanedBranch = (form.branch || userBranch || "").trim();
    const cleanedNotes = form.notes?.trim() || "";
    const payload = {
      couponName: form.name.trim(),
      couponCode: form.code.trim().toUpperCase(),
      couponType: form.couponType,
      discountType: form.couponType,
      discountValue,
      discountRate: discountValue,
      isActive: !!form.isActive,
      active: !!form.isActive,
      startDate: startDateISO,
      endDate: endDateISO,
      expiredDate: endDateISO,
      startDateMs: startDateISO ? dayjs(startDateISO).valueOf() : undefined,
      endDateMs: endDateISO ? dayjs(endDateISO).valueOf() : undefined,
      availableDays: cleanedDays,
      days: cleanedDays,
      validDays: cleanedDays,
      minimumOrderAmount,
      minOrder: minimumOrderAmount,
      appliesTo: form.appliesTo,
      serviceMode: form.appliesTo,
      notes: cleanedNotes,
      description: cleanedNotes,
    };

    if (cleanedBranch) {
      payload.branch = cleanedBranch;
      payload.branchName = cleanedBranch;
    }

    if (form.usageLimit !== "") {
      const usageLimit = Number(form.usageLimit);
      payload.usageLimit = usageLimit;
      payload.maxUsage = usageLimit;
    }

    if (form.perCustomerLimit !== "") {
      const perCustomerLimit = Number(form.perCustomerLimit);
      payload.perCustomerLimit = perCustomerLimit;
      payload.maxUsagePerCustomer = perCustomerLimit;
    }

    return payload;
  };

  const onSaveCoupon = async () => {
    if (!validate()) return;

    setSaving(true);
    setApiError("");
    try {
      const payload = buildPayload();
      if (editingCouponId) {
        await couponApi.updateCoupon(editingCouponId, payload);
        toast.success("Coupon updated.");
      } else {
        await couponApi.createCoupon(payload);
        toast.success("Coupon created.");
      }
      setShowModal(false);
      setEditingCouponId("");
      setForm({ ...emptyForm, branch: userBranch || "" });
      await loadCoupons();
    } catch (error) {
      const parsed = couponApi.parseApiValidationErrors(error);
      if (Object.keys(parsed.fieldErrors).length) {
        setErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
      }
      if (parsed.message) {
        setApiError(parsed.message);
      }
      toast.error(parsed.message || "Unable to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async (coupon) => {
    const couponId = coupon._id || coupon.id;
    if (!couponId) return;

    try {
      const targetStatus = !couponApi.readCouponActive(coupon);
      await couponApi.setCouponStatus(couponId, targetStatus);
      toast.success(`Coupon ${targetStatus ? "activated" : "deactivated"}.`);
      await loadCoupons();
    } catch (error) {
      toast.error(couponApi.parseApiErrorMessage(error, "Unable to change coupon status."));
    }
  };

  const onDeleteCoupon = async (coupon) => {
    const couponId = coupon._id || coupon.id;
    if (!couponId) return;

    try {
      await couponApi.deleteCoupon(couponId);
      toast.success("Coupon deleted.");
      await loadCoupons();
    } catch (error) {
      toast.error(couponApi.parseApiErrorMessage(error, "Unable to delete coupon."));
    }
  };

  return (
    <div className="pt-[80px] p-[10px] w-[92%] mx-auto pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-p-brown">Coupon Management</h1>
        <CommonButton title="Create Coupon" onClick={openCreateModal} />
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-white p-4 rounded-lg shadow mt-5">
        <Select value={filters.status} onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))} options={[{ value: "all", label: "All Statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        <Select value={filters.type} onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))} options={[{ value: "all", label: "All Types" }, ...couponTypeOptions.map((item) => ({ value: item.value, label: item.label }))]} />
        <Input value={filters.code} onChange={(event) => setFilters((prev) => ({ ...prev, code: event.target.value }))} placeholder="Search by code" />
        <Select value={filters.branch} onChange={(value) => setFilters((prev) => ({ ...prev, branch: value }))} options={[{ value: "all", label: "All Branches" }, ...branchOptions.map((item) => ({ value: item, label: item }))]} />
      </div>

      <div className="overflow-x-auto mt-5 bg-white rounded-lg shadow">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-p-yellow text-p-brown">
              <th className="p-3">Name</th>
              <th className="p-3">Code</th>
              <th className="p-3">Type</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Valid Days</th>
              <th className="p-3">Date Range</th>
              <th className="p-3">Applies To</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loadingList && !filteredCoupons.length && (
              <tr>
                <td className="p-4" colSpan={10}>No coupons found.</td>
              </tr>
            )}
            {filteredCoupons.map((coupon) => {
              const couponId = coupon._id || coupon.id;
              const active = couponApi.readCouponActive(coupon);
              const type = coupon.couponType || coupon.discountType || "-";
              const discount = coupon.discountValue ?? coupon.discountRate;
              const days = couponApi.readDays(coupon);
              const start = coupon.startDate ? dayjs(coupon.startDate).format("YYYY-MM-DD") : "-";
              const endValue = coupon.endDate || coupon.expiredDate;
              const end = endValue ? dayjs(endValue).format("YYYY-MM-DD") : "-";
              const appliesTo = couponApi.readAppliesTo(coupon);

              return (
                <tr key={couponId} className="border-b border-gray-100 align-top">
                  <td className="p-3">{coupon.name || coupon.couponName || "-"}</td>
                  <td className="p-3 font-semibold">{coupon.code || coupon.couponCode || "-"}</td>
                  <td className="p-3">{type}</td>
                  <td className="p-3">{couponApi.formatDiscount(type, discount)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">{days.length ? days.join(", ") : "-"}</td>
                  <td className="p-3">{start} to {end}</td>
                  <td className="p-3">{appliesTo}</td>
                  <td className="p-3">{coupon.branch || coupon.branchName || "All"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEditModal(coupon)} className="px-3 py-1 rounded bg-blue-600 text-white">Edit</button>
                      <button onClick={() => onToggleStatus(coupon)} className={`px-3 py-1 rounded text-white ${active ? "bg-orange-600" : "bg-green-700"}`}>{active ? "Deactivate" : "Activate"}</button>
                      <Popconfirm title="Delete coupon?" onConfirm={() => onDeleteCoupon(coupon)}>
                        <button className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
                      </Popconfirm>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        title={editingCouponId ? "Edit Coupon" : "Create Coupon"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={onSaveCoupon}
        okButtonProps={{ loading: saving }}
        width={900}
      >
        {apiError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="font-medium">Coupon Name</label>
            <Input value={form.name} onChange={(event) => updateFormValue("name", event.target.value)} />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="font-medium">Coupon Code</label>
            <Input value={form.code} onChange={(event) => updateFormValue("code", event.target.value.toUpperCase())} />
            {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code}</p>}
          </div>
          <div>
            <label className="font-medium">Coupon Type</label>
            <Select value={form.couponType} onChange={(value) => updateFormValue("couponType", value)} options={couponTypeOptions.map((item) => ({ value: item.value, label: item.label }))} className="w-full" />
            {errors.couponType && <p className="text-red-600 text-sm mt-1">{errors.couponType}</p>}
          </div>
          <div>
            <label className="font-medium">Discount Value</label>
            <Input value={form.discountValue} onChange={(event) => updateFormValue("discountValue", event.target.value)} />
            <p className="text-xs text-gray-500 mt-1">{valueHint}</p>
            {errors.discountValue && <p className="text-red-600 text-sm mt-1">{errors.discountValue}</p>}
          </div>
          <div>
            <label className="font-medium">Start Date</label>
            <DatePicker showTime value={form.startDate} onChange={(value) => updateFormValue("startDate", value)} className="w-full" />
            {errors.startDate && <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="font-medium">End Date</label>
            <DatePicker showTime value={form.endDate} onChange={(value) => updateFormValue("endDate", value)} className="w-full" />
            {errors.endDate && <p className="text-red-600 text-sm mt-1">{errors.endDate}</p>}
          </div>
          <div>
            <label className="font-medium">Available Days</label>
            <Select mode="multiple" value={form.availableDays} onChange={(value) => updateFormValue("availableDays", value)} options={couponDayOptions.map((item) => ({ value: item.value, label: item.label }))} className="w-full" />
            {errors.availableDays && <p className="text-red-600 text-sm mt-1">{errors.availableDays}</p>}
          </div>
          <div>
            <label className="font-medium">Minimum Order Amount</label>
            <Input value={form.minimumOrderAmount} onChange={(event) => updateFormValue("minimumOrderAmount", event.target.value)} />
            {errors.minimumOrderAmount && <p className="text-red-600 text-sm mt-1">{errors.minimumOrderAmount}</p>}
          </div>
          <div>
            <label className="font-medium">Applies To</label>
            <Select value={form.appliesTo} onChange={(value) => updateFormValue("appliesTo", value)} options={appliesToOptions} className="w-full" />
          </div>
          <div>
            <label className="font-medium">Branch</label>
            <Select allowClear value={form.branch || undefined} onChange={(value) => updateFormValue("branch", value || "")} options={branchOptions.map((item) => ({ value: item, label: item }))} placeholder="All branches" className="w-full" />
          </div>
          <div>
            <label className="font-medium">Usage Limit (optional)</label>
            <Input value={form.usageLimit} onChange={(event) => updateFormValue("usageLimit", event.target.value)} />
            {errors.usageLimit && <p className="text-red-600 text-sm mt-1">{errors.usageLimit}</p>}
          </div>
          <div>
            <label className="font-medium">Per Customer Limit (optional)</label>
            <Input value={form.perCustomerLimit} onChange={(event) => updateFormValue("perCustomerLimit", event.target.value)} />
            {errors.perCustomerLimit && <p className="text-red-600 text-sm mt-1">{errors.perCustomerLimit}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="font-medium">Internal Notes / Description (optional)</label>
            <Input.TextArea rows={3} value={form.notes} onChange={(event) => updateFormValue("notes", event.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <label className="font-medium">Active</label>
            <Switch checked={form.isActive} onChange={(checked) => updateFormValue("isActive", checked)} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CouponManagerPage;
