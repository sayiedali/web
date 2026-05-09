"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import apiUrl from "@/app/_host/apiURL";

const page = () => {
  const dataUser = useSelector((data) => data.userData.userInfo?.branchName);

  const [editingId, setEditingId] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    active: true,
    providerType: "in_house_driver",
    vehicle: {
      type: "car",
      licensePlate: "",
      capacity: 1,
    },
    payoutPerDelivery: 0,
  });

  useEffect(() => {
    loadDrivers();
  }, [dataUser]);

  const loadDrivers = async () => {
    try {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `${apiUrl}/api/v1/delivery/getAllDeliveryMan/${dataUser}`,
      };
      const response = await axios.request(config);
      if ("data" in response.data) {
        setDrivers(response.data.data);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load drivers");
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name.startsWith("vehicle.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, [field]: isNaN(value) ? value : Number(value) },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: isNaN(value) ? value : Number(value),
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      active: true,
      providerType: "in_house_driver",
      vehicle: { type: "car", licensePlate: "", capacity: 1 },
      payoutPerDelivery: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      if (editingId) {
        await axios.post(`${apiUrl}/api/v1/delivery/updateDeliveryMan`, {
          id: editingId,
          ...formData,
        });
        toast.success("Driver updated successfully");
      } else {
        await axios.post(`${apiUrl}/api/v1/delivery/createDeliveryMan`, {
          ...formData,
          branch: dataUser,
        });
        toast.success("Driver added successfully");
      }
      resetForm();
      loadDrivers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save driver");
    }
  };

  const handleEdit = (driver) => {
    setEditingId(driver._id);
    setFormData({
      name: driver.name || "",
      phone: driver.phone || "",
      active: driver.active !== false,
      providerType: driver.providerType || "in_house_driver",
      vehicle: driver.vehicle || { type: "car", licensePlate: "", capacity: 1 },
      payoutPerDelivery: driver.payoutPerDelivery || 0,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this driver?")) return;
    try {
      await axios.get(`${apiUrl}/api/v1/delivery/deleteDeleveryMan/${id}`);
      toast.success("Driver deleted");
      loadDrivers();
    } catch (error) {
      toast.error("Failed to delete driver");
    }
  };

  return (
    <div className="pt-[80px] p-[10px] w-full">
      <ToastContainer position="top-center" />

      <h1 className="mt-5 mb-8 text-3xl font-bold text-center text-p-red">
        Manage Delivery Drivers
      </h1>

      {/* Form Section */}
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-p-red">
          {editingId ? "Edit Driver" : "Add New Driver"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Driver name"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="Phone number"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Provider Type</label>
            <select
              name="providerType"
              value={formData.providerType}
              onChange={handleFormChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="in_house_driver">In-House Driver</option>
              <option value="uber_direct">Uber Direct</option>
              <option value="doordash_on_demand">DoorDash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payout per Delivery ($)</label>
            <input
              type="number"
              name="payoutPerDelivery"
              value={formData.payoutPerDelivery}
              onChange={handleFormChange}
              min="0"
              step="0.01"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {formData.providerType === "in_house_driver" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Type</label>
                <select
                  name="vehicle.type"
                  value={formData.vehicle.type}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooter</option>
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="truck">Truck</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">License Plate</label>
                <input
                  type="text"
                  name="vehicle.licensePlate"
                  value={formData.vehicle.licensePlate}
                  onChange={handleFormChange}
                  placeholder="License plate"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Capacity</label>
                <input
                  type="number"
                  name="vehicle.capacity"
                  value={formData.vehicle.capacity}
                  onChange={handleFormChange}
                  min="1"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleFormChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium">Active</label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            className="bg-p-red text-white px-6 py-2 rounded font-medium hover:opacity-90"
          >
            {editingId ? "Update" : "Add"} Driver
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="border border-gray-300 px-6 py-2 rounded font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Drivers List */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-p-red">Drivers List</h2>
        <div className="grid gap-4">
          {drivers.map((driver) => (
            <div
              key={driver._id}
              className="bg-white rounded-lg shadow p-4 border-l-4 border-p-red"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Name</p>
                  <p className="font-semibold">{driver.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Phone</p>
                  <p className="font-semibold">{driver.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Provider</p>
                  <p className="text-sm">{driver.providerType || "In-house"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <p className={`text-sm font-semibold ${driver.active ? "text-green-600" : "text-red-600"}`}>
                    {driver.active ? "Active" : "Inactive"}
                  </p>
                </div>
                {driver.vehicle && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Vehicle</p>
                    <p className="text-sm">{driver.vehicle.type || "N/A"}</p>
                  </div>
                )}
                {driver.completedDeliveryCount !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Deliveries</p>
                    <p className="text-sm">{driver.completedDeliveryCount}</p>
                  </div>
                )}
                {driver.payoutPerDelivery > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Payout/Delivery</p>
                    <p className="text-sm">${driver.payoutPerDelivery.toFixed(2)}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleEdit(driver)}
                  className="px-4 py-1 rounded bg-green-500 text-white text-sm hover:opacity-90"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(driver._id)}
                  className="px-4 py-1 rounded bg-red-500 text-white text-sm hover:opacity-90"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {drivers.length === 0 && (
            <p className="text-center text-gray-500 py-8">No drivers yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default page;
