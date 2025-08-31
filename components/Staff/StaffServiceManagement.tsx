"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { UserRole } from "@prisma/client";

interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  services: string[];
  user: {
    email: string;
    role: UserRole;
  };
  serviceDetails?: {
    id: string;
    name: string;
    base_price: number;
    custom_price?: number;
  }[];
  availabilityCount?: number;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
}

interface APIStaffMember {
  id: string;
  user_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  services: string[];
  user: {
    email: string;
    role: UserRole;
  };
  serviceDetails: {
    id: string;
    name: string;
    base_price: number;
    custom_price?: number;
  }[];
  availabilityCount: number;
}

export default function StaffServiceManagement() {
  const { data: session } = useSession();
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: "",
    services: [] as string[],
    servicePricing: {} as Record<string, number | null>,
  });

  // Load staff's own data and services
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.staffId) return;

      try {
        setIsLoading(true);

        // Fetch services and current staff data in parallel
        const [servicesResponse, staffResponse] = await Promise.all([
          fetch("/api/services"),
          fetch(`/api/staff/${session.user.staffId}`),
        ]);

        if (!servicesResponse.ok || !staffResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const [servicesData, currentStaffData] = await Promise.all([
          servicesResponse.json(),
          staffResponse.json(),
        ]);

        if (servicesData.success && servicesData.services) {
          setServices(servicesData.services);
        }

        if (currentStaffData.success && currentStaffData.staff) {
          const staff: StaffMember = {
            id: currentStaffData.staff.id,
            user_id: currentStaffData.staff.user_id,
            name: currentStaffData.staff.name,
            bio: currentStaffData.staff.bio,
            photo_url: currentStaffData.staff.photo_url,
            services: currentStaffData.staff.services,
            user: {
              email: currentStaffData.staff.user.email,
              role: currentStaffData.staff.user.role,
            },
            serviceDetails: currentStaffData.staff.serviceDetails,
            availabilityCount: currentStaffData.staff.availabilityCount || 0,
          };

          setStaffData(staff);

          // Initialize edit form with current data
          const servicePricing: Record<string, number | null> = {};
          staff.serviceDetails?.forEach((service) => {
            servicePricing[service.id] = service.custom_price || null;
          });

          setEditForm({
            bio: staff.bio || "",
            services: staff.services,
            servicePricing,
          });
        }
      } catch (error) {
        console.error("Error loading staff data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [session?.user?.staffId]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleServiceToggle = (serviceId: string) => {
    setEditForm((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((id) => id !== serviceId)
        : [...prev.services, serviceId],
    }));
  };

  const handlePricingChange = (serviceId: string, value: string) => {
    // Handle whole dollar amounts - user types "50" for $50.00
    const numValue =
      value && value.trim() ? Math.round(parseFloat(value) * 100) : null;
    setEditForm((prev) => ({
      ...prev,
      servicePricing: {
        ...prev.servicePricing,
        [serviceId]: numValue,
      },
    }));
  };

  const handleSave = async () => {
    if (!staffData) return;

    setIsSaving(true);
    try {
      // Transform pricing data for API
      const servicePricing = Object.entries(editForm.servicePricing)
        .filter(([serviceId]) => editForm.services.includes(serviceId))
        .map(([serviceId, customPrice]) => ({
          serviceId,
          customPrice,
        }));

      const response = await fetch(`/api/staff/${staffData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bio: editForm.bio || null,
          services: editForm.services,
          servicePricing,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();

      if (data.success) {
        // Update local state with new data
        setStaffData((prev) =>
          prev
            ? {
                ...prev,
                bio: editForm.bio || null,
                services: editForm.services,
                serviceDetails: services
                  .filter((service) => editForm.services.includes(service.id))
                  .map((service) => ({
                    id: service.id,
                    name: service.name,
                    base_price: service.base_price,
                    custom_price:
                      editForm.servicePricing[service.id] || undefined,
                  })),
              }
            : null
        );

        setIsEditMode(false);
      } else {
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!staffData) return;

    // Reset form to original data
    const servicePricing: Record<string, number | null> = {};
    staffData.serviceDetails?.forEach((service) => {
      servicePricing[service.id] = service.custom_price || null;
    });

    setEditForm({
      bio: staffData.bio || "",
      services: staffData.services,
      servicePricing,
    });

    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile loading */}
        <div className="lg:hidden flex-1 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="p-4 flex-1 overflow-hidden">
            <div className="h-full bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Desktop loading */}
        <div className="hidden lg:block flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Unable to Load Profile
          </h3>
          <p className="text-gray-500 text-sm">
            There was an error loading your profile information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex-1 bg-white flex flex-col">
        {/* Mobile Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">My Services</h2>
          <p className="text-sm text-gray-600">
            Manage your services and pricing
          </p>
        </div>

        {/* Mobile Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Profile Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-shrink-0">
                {staffData.photo_url ? (
                  <Image
                    src={staffData.photo_url}
                    alt={staffData.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-xl font-medium">
                      {staffData.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {staffData.name}
                </h3>
                <p className="text-sm text-gray-500">{staffData.user.email}</p>
              </div>
            </div>

            {/* Bio */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Bio</h4>
              {isEditMode ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Brief description of your expertise and specialties"
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {staffData.bio || "No bio provided"}
                </p>
              )}
            </div>

            {/* Services */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Services
              </h4>
              {isEditMode ? (
                <div className="space-y-2">
                  {services.map((service) => {
                    const isSelected = editForm.services.includes(service.id);
                    const customPrice = editForm.servicePricing[service.id];

                    return (
                      <div
                        key={service.id}
                        className={`border rounded-lg p-3 transition-all ${
                          isSelected
                            ? "border-purple-200 bg-purple-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleServiceToggle(service.id)}
                            className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {service.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                Base: {formatCurrency(service.base_price)}
                              </span>
                            </div>

                            {isSelected && (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Custom Price (optional)
                                </label>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                      customPrice
                                        ? Math.round(
                                            customPrice / 100
                                          ).toString()
                                        : ""
                                    }
                                    onChange={(e) =>
                                      handlePricingChange(
                                        service.id,
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    placeholder={`${Math.round(
                                      service.base_price / 100
                                    )} (base)`}
                                  />
                                  <div className="text-xs text-gray-400 mt-1">
                                    Type whole dollars only
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {staffData.serviceDetails?.map((service) => (
                    <div
                      key={service.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-600">{service.name}</span>
                      <div className="text-right">
                        {service.custom_price ? (
                          <div>
                            <span className="text-gray-900 font-medium">
                              {formatCurrency(service.custom_price)}
                            </span>
                            <span className="text-gray-400 line-through ml-1 text-xs">
                              {formatCurrency(service.base_price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-900">
                            {formatCurrency(service.base_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || editForm.services.length === 0}
                    className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="w-full bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">My Services</h3>
              <p className="mt-1 text-sm text-gray-600">
                Manage your services and view pricing information
              </p>
            </div>

            <div className="p-6">
              <div className="max-w-2xl">
                {/* Profile Section */}
                <div className="flex items-center space-x-6 mb-8">
                  <div className="flex-shrink-0">
                    {staffData.photo_url ? (
                      <Image
                        src={staffData.photo_url}
                        alt={staffData.name}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 text-2xl font-medium">
                          {staffData.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {staffData.name}
                    </h2>
                    <p className="text-gray-500">{staffData.user.email}</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                      {staffData.user.role}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {isEditMode ? (
                      <div className="flex space-x-3">
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving || editForm.services.length === 0}
                          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>

                {/* Bio Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Bio
                  </h3>
                  {isEditMode ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Brief description of your expertise and specialties"
                    />
                  ) : (
                    <p className="text-gray-600">
                      {staffData.bio || "No bio provided"}
                    </p>
                  )}
                </div>

                {/* Services Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Services & Pricing
                  </h3>
                  {isEditMode ? (
                    <div className="space-y-4">
                      {services.map((service) => {
                        const isSelected = editForm.services.includes(
                          service.id
                        );
                        const customPrice = editForm.servicePricing[service.id];

                        return (
                          <div
                            key={service.id}
                            className={`border rounded-lg p-4 transition-all ${
                              isSelected
                                ? "border-purple-200 bg-purple-50"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleServiceToggle(service.id)}
                                className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">
                                    {service.name}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Base: {formatCurrency(service.base_price)}
                                  </span>
                                </div>

                                {isSelected && (
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                      Custom Price (whole dollars only)
                                    </label>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-500">
                                        $
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={
                                          customPrice
                                            ? Math.round(
                                                customPrice / 100
                                              ).toString()
                                            : ""
                                        }
                                        onChange={(e) =>
                                          handlePricingChange(
                                            service.id,
                                            e.target.value
                                          )
                                        }
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        placeholder={`${Math.round(
                                          service.base_price / 100
                                        )} (base)`}
                                      />
                                      {customPrice && (
                                        <button
                                          onClick={() =>
                                            handlePricingChange(service.id, "")
                                          }
                                          className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                          Clear
                                        </button>
                                      )}
                                      <div className="text-xs text-gray-400 mt-1">
                                        Type whole dollars (e.g., &quot;50&quot;
                                        for $50.00)
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-3">
                        {staffData.serviceDetails?.map((service) => (
                          <div
                            key={service.id}
                            className="flex justify-between items-center"
                          >
                            <span className="font-medium text-gray-900">
                              {service.name}
                            </span>
                            <div className="text-right">
                              {service.custom_price ? (
                                <div>
                                  <span className="text-gray-900 font-medium">
                                    {formatCurrency(service.custom_price)}
                                  </span>
                                  <span className="text-gray-400 line-through ml-2 text-sm">
                                    {formatCurrency(service.base_price)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-900">
                                  {formatCurrency(service.base_price)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Section */}
                {/* <div className="mt-8 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Quick Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {staffData.serviceDetails?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Services Offered
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {staffData.availabilityCount}/7
                      </div>
                      <div className="text-sm text-gray-600">
                        Available Days
                      </div>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
