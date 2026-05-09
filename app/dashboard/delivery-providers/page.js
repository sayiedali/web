"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import apiUrl from "@/app/_host/apiURL";

const PROVIDER_INFO = {
  uber_direct: {
    name: "Uber Direct",
    description: "Last-mile delivery via Uber Direct",
    logo: "🚗",
    webhook: "/api/webhooks/providers/uber",
    docs: "https://developer.uber.com/docs/delivery-api/overview",
    color: "bg-black text-white",
  },
  doordash_on_demand: {
    name: "DoorDash On-Demand",
    description: "On-demand delivery via DoorDash",
    logo: "🏃",
    webhook: "/api/webhooks/providers/doordash",
    docs: "https://open.doordash.com/",
    color: "bg-red-600 text-white",
  },
  in_house_driver: {
    name: "In-House Drivers",
    description: "Your own delivery drivers",
    logo: "👤",
    webhook: null,
    docs: null,
    color: "bg-blue-600 text-white",
  },
};

export default function DeliveryProvidersPage() {
  const branch = useSelector((state) => state.userData.userInfo?.branchName || "default");

  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState({});
  const [webhookStatus, setWebhookStatus] = useState({});
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [apiKeys, setApiKeys] = useState({});

  useEffect(() => {
    loadProviderStatus();
  }, []);

  const loadProviderStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/webhooks/providers/health`);
      setProviders(PROVIDER_INFO);
      setWebhookStatus(response.data?.endpoints || {});
    } catch (error) {
      console.error("Failed to load provider status:", error);
      setProviders(PROVIDER_INFO);
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async (provider) => {
    try {
      const payload = {
        provider,
        tracking_id: `test-${Date.now()}`,
        status: "in_transit",
        metadata: {
          distance: 2.5,
          delivery_time: 15,
          timestamp: new Date().toISOString(),
        },
      };

      const response = await axios.post(
        `${apiUrl}/api/webhooks/providers/test`,
        payload
      );

      toast.success(`Test webhook generated for ${provider}`);
      console.log("Test payload:", response.data.payload);
    } catch (error) {
      toast.error("Failed to generate test webhook");
    }
  };

  const copyWebhookUrl = (webhookPath) => {
    const fullUrl = `${apiUrl}${webhookPath}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  return (
    <div className="pt-[80px] p-4 w-full">
      <ToastContainer position="top-center" />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-p-red mb-6">Delivery Providers</h1>

        {loading ? (
          <p className="text-gray-500">Loading provider information...</p>
        ) : (
          <div className="space-y-6">
            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(PROVIDER_INFO).map(([key, provider]) => (
                <div
                  key={key}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-p-red"
                  onClick={() => setSelectedProvider(selectedProvider === key ? null : key)}
                >
                  <div className={`p-6 rounded-t-lg ${provider.color} text-center text-3xl`}>
                    {provider.logo}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{provider.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{provider.description}</p>

                    {key !== "in_house_driver" && (
                      <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-800 mb-3">
                        ⚠️ Requires API credentials from {provider.name}
                      </div>
                    )}

                    {key === "in_house_driver" && (
                      <div className="bg-green-50 border border-green-200 p-2 rounded text-xs text-green-800 mb-3">
                        ✓ Built-in - No setup required
                      </div>
                    )}

                    {selectedProvider === key && provider.webhook && (
                      <div className="text-xs text-gray-500">Click to expand details →</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Provider Details */}
            {selectedProvider && PROVIDER_INFO[selectedProvider] && (
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-p-red">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {PROVIDER_INFO[selectedProvider].name} Configuration
                    </h2>
                    <p className="text-gray-600">
                      {PROVIDER_INFO[selectedProvider].description}
                    </p>
                  </div>
                  {selectedProvider !== "in_house_driver" && (
                    <a
                      href={PROVIDER_INFO[selectedProvider].docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📖 Documentation →
                    </a>
                  )}
                </div>

                {selectedProvider === "in_house_driver" ? (
                  <div className="bg-blue-50 p-4 rounded">
                    <h3 className="font-semibold mb-3">In-House Driver Management</h3>
                    <ul className="space-y-2 text-sm">
                      <li>✓ Create and manage drivers in Driver Management page</li>
                      <li>✓ Assign orders automatically or manually</li>
                      <li>✓ Track deliveries in real-time</li>
                      <li>✓ Calculate payouts and view reports</li>
                      <li>✓ No external API required</li>
                    </ul>
                    <a
                      href="/dashboard/deliveryman"
                      className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:opacity-90"
                    >
                      Go to Driver Management →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Webhook Configuration */}
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold mb-3">Webhook Configuration</h3>
                      <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">Webhook URL</p>
                        <div className="flex gap-2">
                          <code className="flex-1 text-sm break-all font-mono">
                            {apiUrl}
                            {PROVIDER_INFO[selectedProvider].webhook}
                          </code>
                          <button
                            onClick={() =>
                              copyWebhookUrl(PROVIDER_INFO[selectedProvider].webhook)
                            }
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        Register this webhook URL in your {PROVIDER_INFO[selectedProvider].name}{" "}
                        provider dashboard to receive delivery status updates.
                      </p>
                    </div>

                    {/* Setup Instructions */}
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                      <h3 className="font-semibold mb-3 text-yellow-900">Setup Instructions</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                        <li>Create account with {PROVIDER_INFO[selectedProvider].name}</li>
                        <li>Get API credentials from provider dashboard</li>
                        <li>
                          Set environment variables:
                          <div className="bg-white p-2 rounded mt-1 font-mono text-xs">
                            {selectedProvider === "uber_direct"
                              ? "UBER_DIRECT_API_KEY\nUBER_DIRECT_SIGNING_SECRET"
                              : "DOORDASH_API_KEY\nDOORDASH_SIGNING_SECRET"}
                          </div>
                        </li>
                        <li>Copy webhook URL above into provider dashboard</li>
                        <li>Test webhook with button below</li>
                      </ol>
                    </div>

                    {/* Test Webhook */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => testWebhook(selectedProvider)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:opacity-90"
                      >
                        🧪 Test Webhook
                      </button>
                      <button
                        onClick={() => loadProviderStatus()}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:opacity-90"
                      >
                        🔄 Refresh Status
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold mb-3">Integration Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">In-House Drivers</p>
                  <p className="text-lg font-bold text-green-600">✓ Ready</p>
                </div>
                <div>
                  <p className="text-gray-600">Uber Direct</p>
                  <p className="text-lg font-bold text-yellow-600">⚙️ Configurable</p>
                </div>
                <div>
                  <p className="text-gray-600">DoorDash</p>
                  <p className="text-lg font-bold text-yellow-600">⚙️ Configurable</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
