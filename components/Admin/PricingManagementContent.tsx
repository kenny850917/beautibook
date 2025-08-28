"use client";

import { useState, useEffect } from "react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
  description?: string;
}

interface StaffPricing {
  id: string;
  staff_id: string;
  service_id: string;
  custom_price: number;
  staff: {
    name: string;
  };
}

interface ServiceWithPricing extends Service {
  staffPricing: StaffPricing[];
  averagePrice: number;
  hasOverrides: boolean;
}

export default function PricingManagementContent() {
  const [services, setServices] = useState<ServiceWithPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");

  // Load pricing data
  useEffect(() => {
    const loadPricingData = async () => {
      try {
        setIsLoading(true);

        // For MVP, use mock data until API endpoints are created
        // TODO: Replace with actual API calls in Phase 4
        const mockServices: ServiceWithPricing[] = [
          {
            id: "1",
            name: "Haircut",
            duration_minutes: 60,
            base_price: 6500, // $65.00
            description: "Classic cut and style",
            staffPricing: [
              {
                id: "sp1",
                staff_id: "staff1",
                service_id: "1",
                custom_price: 7500, // Sarah charges $75
                staff: { name: "Sarah Johnson" },
              },
            ],
            averagePrice: 7000,
            hasOverrides: true,
          },
          {
            id: "2",
            name: "Hair Color",
            duration_minutes: 120,
            base_price: 12000, // $120.00
            description: "Full color treatment",
            staffPricing: [
              {
                id: "sp2",
                staff_id: "staff3",
                service_id: "2",
                custom_price: 13000, // Lisa charges $130
                staff: { name: "Lisa Rodriguez" },
              },
            ],
            averagePrice: 12500,
            hasOverrides: true,
          },
          {
            id: "3",
            name: "Highlights",
            duration_minutes: 180,
            base_price: 15000, // $150.00
            description: "Partial or full highlights",
            staffPricing: [
              {
                id: "sp3",
                staff_id: "staff1",
                service_id: "3",
                custom_price: 16500, // Sarah charges $165
                staff: { name: "Sarah Johnson" },
              },
            ],
            averagePrice: 15750,
            hasOverrides: true,
          },
          {
            id: "4",
            name: "Blow Dry",
            duration_minutes: 30,
            base_price: 3500, // $35.00
            description: "Shampoo and blow dry styling",
            staffPricing: [],
            averagePrice: 3500,
            hasOverrides: false,
          },
        ];

        setServices(mockServices);
      } catch (error) {
        console.error("Error loading pricing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPricingData();
  }, []);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const handleEditPrice = (serviceId: string, currentPrice: number) => {
    setEditingService(serviceId);
    setNewPrice((currentPrice / 100).toString());
  };

  const handleSavePrice = async (serviceId: string) => {
    try {
      const priceInCents = Math.round(parseFloat(newPrice) * 100);

      // TODO: API call to update price
      console.log(`Updating service ${serviceId} to ${priceInCents} cents`);

      // Update local state
      setServices((prev) =>
        prev.map((service) =>
          service.id === serviceId
            ? { ...service, base_price: priceInCents }
            : service
        )
      );

      setEditingService(null);
      setNewPrice("");
    } catch (error) {
      console.error("Error saving price:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="p-6 flex items-center justify-between animate-pulse"
            >
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="flex items-center space-x-8">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pricing Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Average Service Price
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(
                  services.reduce((sum, s) => sum + s.averagePrice, 0) /
                    services.length
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Services
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {services.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Price Overrides
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {services.filter((s) => s.hasOverrides).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Pricing Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Service Pricing</h3>
          <p className="mt-1 text-sm text-gray-600">
            Base salon pricing and staff-specific overrides
          </p>
        </div>

        {/* Mobile-friendly responsive table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Overrides
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-sm text-gray-500">
                          {service.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(service.duration_minutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingService === service.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={() => handleSavePrice(service.id)}
                          className="text-green-600 hover:text-green-800 p-1"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingService(null)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(service.base_price)}
                        </span>
                        <button
                          onClick={() =>
                            handleEditPrice(service.id, service.base_price)
                          }
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {service.staffPricing.length > 0 ? (
                      <div className="space-y-1">
                        {service.staffPricing.map((pricing) => (
                          <div
                            key={pricing.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-600">
                              {pricing.staff.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(pricing.custom_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">
                        No overrides
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900 min-h-[44px] px-2">
                      Manage Staff Pricing
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View (hidden on desktop) */}
      <div className="lg:hidden space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {service.name}
                </h3>
                <p className="text-sm text-gray-500">{service.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(service.base_price)}
                </div>
                <div className="text-xs text-gray-500">Base Price</div>
              </div>
            </div>

            {service.staffPricing.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Staff Overrides
                </h4>
                {service.staffPricing.map((pricing) => (
                  <div
                    key={pricing.id}
                    className="flex justify-between text-sm py-1"
                  >
                    <span className="text-gray-600">{pricing.staff.name}</span>
                    <span className="font-medium">
                      {formatCurrency(pricing.custom_price)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t">
              <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 min-h-[44px]">
                Manage Pricing
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



