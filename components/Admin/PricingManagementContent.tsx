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
  stats: {
    recentBookings: number;
    recentRevenue: number;
    avgBookingValue: number;
  };
}

interface ApiSummary {
  totalServices: number;
  servicesWithOverrides: number;
  averageBasePrice: number;
  averageMarketPrice: number;
  totalRecentBookings: number;
  totalRecentRevenue: number;
}

export default function PricingManagementContent() {
  const [services, setServices] = useState<ServiceWithPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [apiSummary, setApiSummary] = useState<ApiSummary | null>(null);

  // Service creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    duration_minutes: 60,
    base_price: 50,
    description: "",
  });

  // Service editing modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingServiceData, setEditingServiceData] =
    useState<ServiceWithPricing | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    duration_minutes: 60,
    base_price: 50,
    description: "",
  });

  // Staff pricing management modal state
  const [isStaffPricingModalOpen, setIsStaffPricingModalOpen] = useState(false);
  const [staffPricingService, setStaffPricingService] =
    useState<ServiceWithPricing | null>(null);
  const [availableStaff, setAvailableStaff] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isSavingStaffPricing, setIsSavingStaffPricing] = useState(false);
  const [staffPricingForm, setStaffPricingForm] = useState({
    staffId: "",
    customPrice: "",
  });
  const [editingStaffPricing, setEditingStaffPricing] =
    useState<StaffPricing | null>(null);

  // Load pricing data from real API
  useEffect(() => {
    const loadPricingData = async () => {
      try {
        setIsLoading(true);

        const response = await fetch("/api/admin/services", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setServices(data.services || []);
          setApiSummary(data.summary || null);
        } else {
          throw new Error(data.error || "Failed to load services");
        }
      } catch (error) {
        console.error("Error loading pricing data:", error);
        setServices([]); // Set empty array on error
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

      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base_price: priceInCents,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update local state with the response
        setServices((prev) =>
          prev.map((service) =>
            service.id === serviceId ? data.service : service
          )
        );
      } else {
        throw new Error(data.error || "Failed to update price");
      }

      setEditingService(null);
      setNewPrice("");
    } catch (error) {
      console.error("Error saving price:", error);
      // Optional: Show error message to user
    }
  };

  const handleCreateService = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createForm.name,
          duration_minutes: createForm.duration_minutes,
          base_price: createForm.base_price * 100, // Convert to cents
          description: createForm.description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create service");
      }

      const data = await response.json();

      if (data.success) {
        // Add the new service to the list
        setServices((prev) => [...prev, data.service]);

        // Reset form and close modal
        setCreateForm({
          name: "",
          duration_minutes: 60,
          base_price: 50,
          description: "",
        });
        setIsCreateModalOpen(false);

        alert("Service created successfully!");
      } else {
        throw new Error(data.error || "Failed to create service");
      }
    } catch (error) {
      console.error("Error creating service:", error);
      alert(
        `Failed to create service: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditService = (service: ServiceWithPricing) => {
    setEditingServiceData(service);
    setEditForm({
      name: service.name,
      duration_minutes: service.duration_minutes,
      base_price: service.base_price / 100, // Convert from cents to dollars
      description: "", // Note: description not in current schema
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateService = async () => {
    if (!editingServiceData) return;

    setIsEditing(true);
    try {
      const response = await fetch(
        `/api/admin/services/${editingServiceData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editForm.name,
            duration_minutes: editForm.duration_minutes,
            base_price: editForm.base_price * 100, // Convert to cents
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update service");
      }

      const data = await response.json();

      if (data.success) {
        // Update the service in the list
        setServices((prev) =>
          prev.map((service) =>
            service.id === editingServiceData.id
              ? {
                  ...service,
                  ...data.service,
                  base_price: data.service.base_price,
                }
              : service
          )
        );

        // Close modal and reset
        setIsEditModalOpen(false);
        setEditingServiceData(null);

        alert("Service updated successfully!");
      } else {
        throw new Error(data.error || "Failed to update service");
      }
    } catch (error) {
      console.error("Error updating service:", error);
      alert(
        `Failed to update service: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleManageStaffPricing = async (service: ServiceWithPricing) => {
    setStaffPricingService(service);
    setIsStaffPricingModalOpen(true);

    // Load available staff
    setIsLoadingStaff(true);
    try {
      const response = await fetch("/api/admin/staff");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.staff) {
          setAvailableStaff(
            data.staff.map((staff: { id: string; name: string }) => ({
              id: staff.id,
              name: staff.name,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading staff:", error);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleAddStaffPricing = async () => {
    if (
      !staffPricingService ||
      !staffPricingForm.staffId ||
      !staffPricingForm.customPrice
    ) {
      return;
    }

    setIsSavingStaffPricing(true);
    try {
      const response = await fetch(
        `/api/admin/services/${staffPricingService.id}/staff-pricing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            staffId: staffPricingForm.staffId,
            customPrice: Math.round(
              parseFloat(staffPricingForm.customPrice) * 100
            ), // Convert to cents
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add staff pricing");
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setServices((prev) =>
          prev.map((service) =>
            service.id === staffPricingService.id
              ? {
                  ...service,
                  staffPricing: [...service.staffPricing, data.staffPricing],
                  hasOverrides: true,
                  averagePrice:
                    data.updatedService?.averagePrice || service.averagePrice,
                }
              : service
          )
        );

        // Update the modal service data
        setStaffPricingService((prev) =>
          prev
            ? {
                ...prev,
                staffPricing: [...prev.staffPricing, data.staffPricing],
                hasOverrides: true,
              }
            : null
        );

        // Reset form
        setStaffPricingForm({
          staffId: "",
          customPrice: "",
        });

        alert("Staff pricing added successfully!");
      } else {
        throw new Error(data.error || "Failed to add staff pricing");
      }
    } catch (error) {
      console.error("Error adding staff pricing:", error);
      alert(
        `Failed to add staff pricing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSavingStaffPricing(false);
    }
  };

  const handleEditStaffPricing = (staffPricing: StaffPricing) => {
    setEditingStaffPricing(staffPricing);
    setStaffPricingForm({
      staffId: staffPricing.staff_id,
      customPrice: (staffPricing.custom_price / 100).toString(),
    });
  };

  const handleUpdateStaffPricing = async () => {
    if (!editingStaffPricing || !staffPricingForm.customPrice) {
      return;
    }

    setIsSavingStaffPricing(true);
    try {
      const response = await fetch(
        `/api/admin/services/${editingStaffPricing.service_id}/staff-pricing/${editingStaffPricing.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customPrice: Math.round(
              parseFloat(staffPricingForm.customPrice) * 100
            ), // Convert to cents
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update staff pricing");
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setServices((prev) =>
          prev.map((service) =>
            service.id === editingStaffPricing.service_id
              ? {
                  ...service,
                  staffPricing: service.staffPricing.map((pricing) =>
                    pricing.id === editingStaffPricing.id
                      ? data.staffPricing
                      : pricing
                  ),
                  averagePrice:
                    data.updatedService?.averagePrice || service.averagePrice,
                }
              : service
          )
        );

        // Update the modal service data
        setStaffPricingService((prev) =>
          prev
            ? {
                ...prev,
                staffPricing: prev.staffPricing.map((pricing) =>
                  pricing.id === editingStaffPricing.id
                    ? data.staffPricing
                    : pricing
                ),
              }
            : null
        );

        // Reset form
        setEditingStaffPricing(null);
        setStaffPricingForm({
          staffId: "",
          customPrice: "",
        });

        alert("Staff pricing updated successfully!");
      } else {
        throw new Error(data.error || "Failed to update staff pricing");
      }
    } catch (error) {
      console.error("Error updating staff pricing:", error);
      alert(
        `Failed to update staff pricing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSavingStaffPricing(false);
    }
  };

  const handleDeleteStaffPricing = async (staffPricingId: string) => {
    if (!staffPricingService) return;

    if (
      !confirm("Are you sure you want to remove this staff pricing override?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/services/${staffPricingService.id}/staff-pricing/${staffPricingId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete staff pricing");
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setServices((prev) =>
          prev.map((service) =>
            service.id === staffPricingService.id
              ? {
                  ...service,
                  staffPricing: service.staffPricing.filter(
                    (pricing) => pricing.id !== staffPricingId
                  ),
                  hasOverrides:
                    service.staffPricing.filter(
                      (pricing) => pricing.id !== staffPricingId
                    ).length > 0,
                  averagePrice:
                    data.updatedService?.averagePrice || service.averagePrice,
                }
              : service
          )
        );

        // Update the modal service data
        setStaffPricingService((prev) =>
          prev
            ? {
                ...prev,
                staffPricing: prev.staffPricing.filter(
                  (pricing) => pricing.id !== staffPricingId
                ),
                hasOverrides:
                  prev.staffPricing.filter(
                    (pricing) => pricing.id !== staffPricingId
                  ).length > 0,
              }
            : null
        );

        alert("Staff pricing removed successfully!");
      } else {
        throw new Error(data.error || "Failed to delete staff pricing");
      }
    } catch (error) {
      console.error("Error deleting staff pricing:", error);
      alert(
        `Failed to remove staff pricing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const cancelStaffPricingEdit = () => {
    setEditingStaffPricing(null);
    setStaffPricingForm({
      staffId: "",
      customPrice: "",
    });
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
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Service
          </button>
        </div>
      </div>

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
                  apiSummary?.averageMarketPrice ||
                    (services.length > 0
                      ? services.reduce((sum, s) => sum + s.averagePrice, 0) /
                        services.length
                      : 0)
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
                {apiSummary?.totalServices || services.length}
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
                {apiSummary?.servicesWithOverrides ||
                  services.filter((s) => s.hasOverrides).length}
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleManageStaffPricing(service)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Manage Staff Pricing"
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
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditService(service)}
                        className="text-gray-600 hover:text-gray-800 p-1"
                        title="Edit Service"
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

            <div className="mt-3 pt-3 border-t space-y-2">
              <button
                onClick={() => handleManageStaffPricing(service)}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 min-h-[44px]"
              >
                Manage Staff Pricing
              </button>
              <button
                onClick={() => handleEditService(service)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 min-h-[44px]"
              >
                Edit Service
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Service Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Service
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
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
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Men's Haircut"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={createForm.duration_minutes}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  min="15"
                  max="480"
                  step="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price ($) *
                </label>
                <input
                  type="number"
                  value={createForm.base_price}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      base_price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  min="1"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Brief description of the service..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreating}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateService}
                disabled={
                  isCreating ||
                  !createForm.name ||
                  createForm.duration_minutes < 15 ||
                  createForm.base_price <= 0
                }
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Create Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Edit Modal */}
      {isEditModalOpen && editingServiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Service: {editingServiceData.name}
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
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
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Men's Haircut"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={editForm.duration_minutes}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  min="15"
                  max="480"
                  step="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price ($) *
                </label>
                <input
                  type="number"
                  value={editForm.base_price}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      base_price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  min="1"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Show staff pricing information */}
              {editingServiceData.hasOverrides && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Current Staff Pricing Overrides:
                  </h4>
                  {editingServiceData.staffPricing.map((pricing) => (
                    <div
                      key={pricing.id}
                      className="flex justify-between text-sm py-1"
                    >
                      <span className="text-gray-600">
                        {pricing.staff.name}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(pricing.custom_price)}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Changing the base price won&apos;t affect existing
                    staff overrides.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isEditing}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateService}
                disabled={
                  isEditing ||
                  !editForm.name ||
                  editForm.duration_minutes < 15 ||
                  editForm.base_price <= 0
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? "Updating..." : "Update Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Pricing Management Modal */}
      {isStaffPricingModalOpen && staffPricingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Manage Staff Pricing: {staffPricingService.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Base Price: {formatCurrency(staffPricingService.base_price)}{" "}
                    | Duration:{" "}
                    {formatDuration(staffPricingService.duration_minutes)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsStaffPricingModalOpen(false);
                    setStaffPricingService(null);
                    setEditingStaffPricing(null);
                    setStaffPricingForm({ staffId: "", customPrice: "" });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
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
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {/* Add/Edit Staff Pricing Form */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {editingStaffPricing
                    ? "Edit Staff Pricing"
                    : "Add Staff Pricing Override"}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staff Member
                    </label>
                    {editingStaffPricing ? (
                      <input
                        type="text"
                        value={
                          availableStaff.find(
                            (s) => s.id === staffPricingForm.staffId
                          )?.name || ""
                        }
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    ) : (
                      <select
                        value={staffPricingForm.staffId}
                        onChange={(e) =>
                          setStaffPricingForm((prev) => ({
                            ...prev,
                            staffId: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isLoadingStaff}
                      >
                        <option value="">Select Staff</option>
                        {availableStaff
                          .filter(
                            (staff) =>
                              !staffPricingService.staffPricing.some(
                                (pricing) => pricing.staff_id === staff.id
                              )
                          )
                          .map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={staffPricingForm.customPrice}
                      onChange={(e) =>
                        setStaffPricingForm((prev) => ({
                          ...prev,
                          customPrice: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder={(
                        staffPricingService.base_price / 100
                      ).toFixed(2)}
                    />
                  </div>

                  <div className="flex items-end">
                    {editingStaffPricing ? (
                      <div className="flex space-x-2 w-full">
                        <button
                          onClick={handleUpdateStaffPricing}
                          disabled={
                            isSavingStaffPricing ||
                            !staffPricingForm.customPrice
                          }
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingStaffPricing ? "Updating..." : "Update"}
                        </button>
                        <button
                          onClick={cancelStaffPricingEdit}
                          disabled={isSavingStaffPricing}
                          className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleAddStaffPricing}
                        disabled={
                          isSavingStaffPricing ||
                          !staffPricingForm.staffId ||
                          !staffPricingForm.customPrice ||
                          isLoadingStaff
                        }
                        className="w-full bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingStaffPricing ? "Adding..." : "Add Override"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Staff Pricing Overrides */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Current Staff Pricing Overrides
                </h4>

                {staffPricingService.staffPricing.length > 0 ? (
                  <div className="space-y-2">
                    {staffPricingService.staffPricing.map((pricing) => (
                      <div
                        key={pricing.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {pricing.staff.name}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {formatCurrency(pricing.custom_price)}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            (Base:{" "}
                            {formatCurrency(staffPricingService.base_price)})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditStaffPricing(pricing)}
                            disabled={
                              isSavingStaffPricing ||
                              editingStaffPricing !== null
                            }
                            className="text-blue-600 hover:text-blue-800 p-1 disabled:opacity-50"
                            title="Edit Price"
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
                          <button
                            onClick={() => handleDeleteStaffPricing(pricing.id)}
                            disabled={isSavingStaffPricing}
                            className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                            title="Remove Override"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="h-12 w-12 mx-auto mb-4 text-gray-300"
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
                    <p>No staff pricing overrides yet</p>
                    <p className="text-sm">
                      Add an override above to get started
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setIsStaffPricingModalOpen(false);
                  setStaffPricingService(null);
                  setEditingStaffPricing(null);
                  setStaffPricingForm({ staffId: "", customPrice: "" });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
