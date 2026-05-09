"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import apiUrl from "@/app/_host/apiURL";

export default function PayrollReportsPage() {
  const branch = useSelector((state) => state.userData.userInfo?.branchName || "default");

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverHistory, setDriverHistory] = useState(null);
  const [tab, setTab] = useState("summary"); // summary, drivers, history

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleString("default", { month: "long" }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadPayrollReport();
  }, [selectedMonth, selectedYear, branch]);

  const loadPayrollReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/delivery/metrics/payroll/report`, {
        params: {
          branch,
          month: selectedMonth,
          year: selectedYear,
        },
      });
      setReportData(response.data?.data);
    } catch (error) {
      console.error("Failed to load payroll report:", error);
      toast.error("Failed to load payroll report");
    } finally {
      setLoading(false);
    }
  };

  const loadDriverHistory = async (driverId) => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/delivery/metrics/payroll/driver/${driverId}/history`,
        {
          params: { limit: 50 },
        }
      );
      setDriverHistory(response.data?.data);
      setSelectedDriver(driverId);
      setTab("history");
    } catch (error) {
      toast.error("Failed to load driver history");
    }
  };

  const exportToCSV = () => {
    if (!reportData?.drivers) {
      toast.warning("No data to export");
      return;
    }

    const headers = [
      "Driver Name",
      "Phone",
      "Completed Deliveries",
      "Total Payout",
      "Avg Delivery Time (min)",
      "Total Distance (km)",
    ];

    const rows = reportData.drivers.map((driver) => [
      driver.driverName,
      driver.phone,
      driver.completedDeliveries,
      driver.totalPayout,
      driver.avgDeliveryTime || 0,
      driver.totalDistance || 0,
    ]);

    const csv = [
      `Payroll Report - ${new Date(selectedYear, selectedMonth - 1, 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })}`,
      `Branch: ${branch}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      "SUMMARY",
      `Total Drivers,${reportData.summary?.driverCount}`,
      `Total Deliveries,${reportData.summary?.totalDeliveries}`,
      `Total Payroll,$${reportData.summary?.totalPayroll}`,
      `Average Pay Per Driver,$${reportData.summary?.averagePayPerDriver}`,
    ].join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(csv)
    );
    element.setAttribute(
      "download",
      `payroll-${branch}-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Report exported to CSV");
  };

  return (
    <div className="pt-[80px] p-4 w-full">
      <ToastContainer position="top-center" />

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-p-red">Payroll Reports</h1>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:opacity-90"
          >
            📥 Export to CSV
          </button>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Branch</p>
              <p className="font-semibold text-lg">{branch}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading payroll data...</p>
        ) : reportData ? (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => setTab("summary")}
                className={`px-4 py-2 font-medium ${
                  tab === "summary"
                    ? "border-b-2 border-p-red text-p-red"
                    : "text-gray-600"
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setTab("drivers")}
                className={`px-4 py-2 font-medium ${
                  tab === "drivers"
                    ? "border-b-2 border-p-red text-p-red"
                    : "text-gray-600"
                }`}
              >
                Drivers ({reportData.drivers?.length || 0})
              </button>
              {driverHistory && (
                <button
                  onClick={() => setTab("history")}
                  className={`px-4 py-2 font-medium ${
                    tab === "history"
                      ? "border-b-2 border-p-red text-p-red"
                      : "text-gray-600"
                  }`}
                >
                  {driverHistory.driverName} History
                </button>
              )}
            </div>

            {/* Summary Tab */}
            {tab === "summary" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 uppercase">Active Drivers</p>
                  <p className="text-3xl font-bold text-p-red">
                    {reportData.summary?.driverCount || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 uppercase">Total Deliveries</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {reportData.summary?.totalDeliveries || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 uppercase">Total Payroll</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${reportData.summary?.totalPayroll || 0}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500 uppercase">Avg Per Driver</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ${reportData.summary?.averagePayPerDriver || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Drivers Tab */}
            {tab === "drivers" && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Driver</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Deliveries</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Avg Time</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Distance</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Total Payout</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.drivers?.map((driver) => (
                      <tr key={driver.driverId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{driver.driverName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{driver.phone}</td>
                        <td className="px-4 py-3 text-right">{driver.completedDeliveries}</td>
                        <td className="px-4 py-3 text-right">
                          {driver.avgDeliveryTime || "N/A"} min
                        </td>
                        <td className="px-4 py-3 text-right">
                          {driver.totalDistance || "N/A"} km
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ${driver.totalPayout}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => loadDriverHistory(driver.driverId)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* History Tab */}
            {tab === "history" && driverHistory && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 uppercase">Driver</p>
                  <p className="text-xl font-bold">{driverHistory.driverName}</p>
                  <p className="text-sm text-gray-600">
                    Payout: ${driverHistory.payoutPerDelivery}/delivery
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Order</th>
                        <th className="px-4 py-2 text-left">Customer</th>
                        <th className="px-4 py-2 text-right">Value</th>
                        <th className="px-4 py-2 text-right">Time (min)</th>
                        <th className="px-4 py-2 text-right">Distance (km)</th>
                        <th className="px-4 py-2 text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {driverHistory.deliveries?.map((delivery) => (
                        <tr key={delivery.orderId} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">
                            {String(delivery.orderId).substring(0, 8)}...
                          </td>
                          <td className="px-4 py-2">{delivery.customerName}</td>
                          <td className="px-4 py-2 text-right">${delivery.orderValue}</td>
                          <td className="px-4 py-2 text-right">{delivery.deliveryTime || "N/A"}</td>
                          <td className="px-4 py-2 text-right">{delivery.distance || "N/A"}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600">
                            ${delivery.payout}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">No payroll data available</p>
        )}
      </div>
    </div>
  );
}
