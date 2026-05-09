"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import apiUrl from "@/app/_host/apiURL";

export default function DeliveryManagementPage() {
  const branch = useSelector((state) => state.userData.userInfo?.branchName || "default");

  const [loading, setLoading] = useState(true);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [tab, setTab] = useState("unassigned"); // unassigned, active, completed

  useEffect(() => {
    loadData();
  }, [branch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, driversRes, activeRes] = await Promise.all([
        axios.get(`${apiUrl}/api/delivery/assignments/branch/${branch}/unassigned`),
        axios.get(`${apiUrl}/api/v1/delivery/getAllDeliveryMan/${branch}`),
        axios.get(`${apiUrl}/api/delivery/assignments/branch/${branch}?status=assigned,accepted,picked_up,in_transit`),
      ]);

      setUnassignedOrders(ordersRes.data?.data || []);
      setDrivers(driversRes.data?.data || []);
      setActiveOrders(activeRes.data?.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load delivery data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedOrder || !selectedDriver) {
      toast.error("Please select both an order and a driver");
      return;
    }

    setAssigning(true);
    try {
      const response = await axios.post(`${apiUrl}/api/delivery/assignments`, {
        orderId: selectedOrder._id,
        deliveryManId: selectedDriver._id,
        provider: "in_house_driver",
      });

      toast.success("Driver assigned successfully");
      setSelectedOrder(null);
      setSelectedDriver(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to assign driver");
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (assignmentId, newStatus) => {
    try {
      await axios.patch(`${apiUrl}/api/delivery/assignments/${assignmentId}/status`, {
        status: newStatus,
      });
      toast.success(`Assignment status updated to ${newStatus}`);
      await loadData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const activeDrivers = drivers.filter((d) => d.active !== false);

  return (
    <div className="pt-[80px] p-4 w-full">
      <ToastContainer position="top-center" />

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-p-red mb-6">Delivery Management</h1>

        {loading ? (
          <p className="text-gray-500">Loading delivery data...</p>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => setTab("unassigned")}
                className={`px-4 py-2 font-medium ${
                  tab === "unassigned"
                    ? "border-b-2 border-p-red text-p-red"
                    : "text-gray-600"
                }`}
              >
                Unassigned Orders ({unassignedOrders.length})
              </button>
              <button
                onClick={() => setTab("active")}
                className={`px-4 py-2 font-medium ${
                  tab === "active"
                    ? "border-b-2 border-p-red text-p-red"
                    : "text-gray-600"
                }`}
              >
                Active Deliveries ({activeOrders.length})
              </button>
            </div>

            {/* Unassigned Orders Tab */}
            {tab === "unassigned" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order List */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b">
                      <h2 className="font-bold text-lg">Orders Needing Assignment</h2>
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                      {unassignedOrders.length === 0 ? (
                        <p className="p-4 text-gray-500 text-center">All orders assigned!</p>
                      ) : (
                        unassignedOrders.map((order) => (
                          <div
                            key={order._id}
                            onClick={() => setSelectedOrder(order)}
                            className={`p-4 cursor-pointer hover:bg-gray-50 ${
                              selectedOrder?._id === order._id
                                ? "bg-blue-50 border-l-4 border-p-red"
                                : ""
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold">{order.userName}</p>
                                <p className="text-sm text-gray-600">{order.phone}</p>
                              </div>
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                {order.orderStatus}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{order.orderLocation}</p>
                            <p className="text-xs text-gray-500">
                              Order: ${order.orderPrice} | {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Driver Assignment Panel */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-bold mb-4">Assign Driver</h3>

                  {selectedOrder ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm font-medium">Selected Order</p>
                        <p className="text-sm">{selectedOrder.userName}</p>
                        <p className="text-xs text-gray-600">{selectedOrder.orderLocation}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Select Driver</label>
                        <select
                          value={selectedDriver?._id || ""}
                          onChange={(e) => {
                            const driver = drivers.find((d) => d._id === e.target.value);
                            setSelectedDriver(driver);
                          }}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="">Choose a driver...</option>
                          {activeDrivers.map((driver) => (
                            <option key={driver._id} value={driver._id}>
                              {driver.name} ({driver.phone})
                              {driver.completedDeliveryCount > 0 && ` - ${driver.completedDeliveryCount} deliveries`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedDriver && (
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <p className="font-medium mb-2">{selectedDriver.name}</p>
                          <p className="text-xs text-gray-600 mb-1">
                            Vehicle: {selectedDriver.vehicle?.type || "N/A"}
                          </p>
                          <p className="text-xs text-gray-600">
                            Payout: ${selectedDriver.payoutPerDelivery || 0}/delivery
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleAssignDriver}
                        disabled={assigning || !selectedDriver}
                        className="w-full bg-p-red text-white py-2 rounded font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {assigning ? "Assigning..." : "Assign Driver"}
                      </button>

                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="w-full border border-gray-300 py-2 rounded text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Select an order to assign a driver</p>
                  )}

                  {activeDrivers.length === 0 && (
                    <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mt-4">
                      No active drivers available. Create drivers in the Driver Management page.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Deliveries Tab */}
            {tab === "active" && (
              <div className="space-y-4">
                {activeOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active deliveries</p>
                ) : (
                  activeOrders.map((assignment) => (
                    <div key={assignment._id} className="bg-white rounded-lg shadow p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Customer</p>
                          <p className="font-semibold">{assignment.orderId?.userName}</p>
                          <p className="text-sm text-gray-600">{assignment.orderId?.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Driver</p>
                          <p className="font-semibold">{assignment.deliveryManId?.name || "External"}</p>
                          <p className="text-sm text-gray-600">{assignment.provider}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Status</p>
                          <p className="font-semibold text-p-red">{assignment.status}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(assignment.assignedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {assignment.status === "assigned" && (
                          <button
                            onClick={() => handleStatusUpdate(assignment._id, "accepted")}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                          >
                            Accept
                          </button>
                        )}
                        {assignment.status === "accepted" && (
                          <button
                            onClick={() => handleStatusUpdate(assignment._id, "picked_up")}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                          >
                            Picked Up
                          </button>
                        )}
                        {assignment.status === "picked_up" && (
                          <button
                            onClick={() => handleStatusUpdate(assignment._id, "in_transit")}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                          >
                            In Transit
                          </button>
                        )}
                        {assignment.status === "in_transit" && (
                          <button
                            onClick={() => handleStatusUpdate(assignment._id, "delivered")}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
