"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { UserRole } from "@prisma/client";
import StaffScheduleManagement from "./StaffScheduleManagement";

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

export default function StaffManagementContent() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    services: [] as string[],
    servicePricing: {} as Record<string, number | null>,
  });
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    bio: "",
    temporaryPassword: "",
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null
  );

  // Load staff and services data from real APIs
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Fetch services and staff data in parallel
        const [servicesResponse, staffResponse] = await Promise.all([
          fetch("/api/admin/services"),
          fetch("/api/admin/staff"),
        ]);

        if (!servicesResponse.ok || !staffResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const [servicesData, staffData] = await Promise.all([
          servicesResponse.json(),
          staffResponse.json(),
        ]);

        if (servicesData.success && servicesData.services) {
          setServices(servicesData.services);
        }

        if (staffData.success && staffData.staff) {
          // Transform API response to match component interface
          const transformedStaff: StaffMember[] = staffData.staff.map(
            (member: APIStaffMember) => ({
              id: member.id,
              user_id: member.user_id,
              name: member.name,
              bio: member.bio,
              photo_url: member.photo_url,
              services: member.services,
              user: {
                email: member.user.email,
                role: member.user.role,
              },
              serviceDetails: member.serviceDetails,
              availabilityCount: member.availabilityCount || 0,
            })
          );

          setStaff(transformedStaff);
        }
      } catch (error) {
        console.error("Error loading staff data:", error);
        // You could set an error state here to show to the user
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);

    // Populate form with current staff data
    const servicePricing: Record<string, number | null> = {};
    staff.serviceDetails?.forEach((service) => {
      servicePricing[service.id] = service.custom_price || null;
    });

    setEditForm({
      name: staff.name,
      bio: staff.bio || "",
      services: staff.services,
      servicePricing,
    });

    setIsModalOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!selectedStaff) return;

    setIsSaving(true);
    try {
      // Transform pricing data for API
      const servicePricing = Object.entries(editForm.servicePricing)
        .filter(([serviceId]) => editForm.services.includes(serviceId))
        .map(([serviceId, customPrice]) => ({
          serviceId,
          customPrice,
        }));

      const response = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          bio: editForm.bio || null,
          services: editForm.services,
          servicePricing,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update staff member");
      }

      const data = await response.json();

      if (data.success) {
        // Update local state with new data
        setStaff((prevStaff) =>
          prevStaff.map((member) =>
            member.id === selectedStaff.id
              ? {
                  ...member,
                  name: editForm.name,
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
              : member
          )
        );

        setIsModalOpen(false);
        setSelectedStaff(null);
      } else {
        throw new Error(data.error || "Failed to update staff member");
      }
    } catch (error) {
      console.error("Error updating staff:", error);
      alert("Failed to update staff member. Please try again.");
    } finally {
      setIsSaving(false);
    }
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

  const handleCreateStaff = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          bio: createForm.bio || undefined,
          temporaryPassword: createForm.temporaryPassword || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create staff member");
      }

      const data = await response.json();

      if (data.success) {
        // Add new staff to local state
        setStaff((prev) => [...prev, data.staff]);

        // Show generated password if one was created
        if (data.temporaryPassword) {
          setGeneratedPassword(data.temporaryPassword);
        }

        // Reset form
        setCreateForm({
          name: "",
          email: "",
          bio: "",
          temporaryPassword: "",
        });

        // Keep modal open to show password if generated
        if (!data.temporaryPassword) {
          setIsCreateModalOpen(false);
        }
      } else {
        throw new Error(data.error || "Failed to create staff member");
      }
    } catch (error) {
      console.error("Error creating staff:", error);
      alert(
        `Failed to create staff member: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (staffMember: StaffMember) => {
    const confirmMessage = `Are you sure you want to remove ${staffMember.name}?\n\nThis action cannot be undone. The staff member will be removed from the system, but their booking history will be preserved.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/staff/${staffMember.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle business logic errors with helpful messages
        if (response.status === 409) {
          alert(
            `Cannot remove ${staffMember.name}:\n\n${data.reason}\n\n${
              data.suggestion || ""
            }`
          );
          return;
        }
        throw new Error(data.error || "Failed to remove staff member");
      }

      if (data.success) {
        // Remove staff from local state
        setStaff((prev) =>
          prev.filter((member) => member.id !== staffMember.id)
        );
        alert(
          `${staffMember.name} has been successfully removed from the system.`
        );
      } else {
        throw new Error(data.error || "Failed to remove staff member");
      }
    } catch (error) {
      console.error("Error removing staff:", error);
      alert(
        `Failed to remove staff member: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleManageSchedule = (staffMember: StaffMember) => {
    setScheduleStaff({
      id: staffMember.id,
      name: staffMember.name,
    });
    setIsScheduleModalOpen(true);
  };

  const getServiceNames = (serviceIds: string[]): string => {
    return serviceIds
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Staff Header */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-shrink-0">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url}
                      alt={member.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-xl font-medium">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {member.name}
                  </h3>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {member.user.role}
                  </span>
                </div>
              </div>

              {/* Bio */}
              {member.bio && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {member.bio}
                </p>
              )}

              {/* Services */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Services
                </h4>
                <div className="space-y-1">
                  {member.serviceDetails?.map((service) => (
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
              </div>

              {/* Availability */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Available Days</span>
                  <span className="text-gray-900 font-medium">
                    {member.availabilityCount}/7 days
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${((member.availabilityCount || 0) / 7) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleEditStaff(member)}
                  className="bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleManageSchedule(member)}
                  className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
                >
                  Schedule
                </button>
                <button
                  onClick={() => handleDeleteStaff(member)}
                  className="border border-red-300 text-red-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px]"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Staff Card */}
        <div className="bg-white rounded-lg shadow border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors">
          <div className="p-6 text-center">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-gray-400"
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
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Add Staff Member
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Create a new staff account and assign services
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]"
            >
              Add New Staff
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Staff Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {staff.length}
            </div>
            <div className="text-sm text-gray-600">Total Staff</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {
                staff.filter(
                  (s) => s.availabilityCount && s.availabilityCount >= 5
                ).length
              }
            </div>
            <div className="text-sm text-gray-600">Highly Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {services.length}
            </div>
            <div className="text-sm text-gray-600">Services Offered</div>
          </div>
        </div>
      </div>

      {/* Staff Edit Modal */}
      {isModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-6">
              Edit {selectedStaff.name}
            </h3>

            {/* Staff Details Form */}
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Staff member name"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Brief description of expertise and specialties"
                />
              </div>

              {/* Services & Pricing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Services & Custom Pricing
                </label>
                <div className="space-y-3">
                  {services.map((service) => {
                    const isSelected = editForm.services.includes(service.id);
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
                                    )} (base price)`}
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
                                    Enter whole dollars (e.g., type
                                    &quot;50&quot; for $50.00)
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
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaff}
                disabled={
                  isSaving ||
                  !editForm.name.trim() ||
                  editForm.services.length === 0
                }
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-6">Add New Staff Member</h3>

            {generatedPassword ? (
              // Show generated password
              <div className="text-center">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    Staff Member Created Successfully!
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    {createForm.name} has been added to the system.
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-600 mb-1">
                      Temporary Password:
                    </p>
                    <code className="text-lg font-mono bg-gray-100 px-2 py-1 rounded">
                      {generatedPassword}
                    </code>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Please share this password securely with the new staff
                    member. They should change it on first login.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedPassword(null);
                    setIsCreateModalOpen(false);
                  }}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 min-h-[44px]"
                >
                  Done
                </button>
              </div>
            ) : (
              // Create staff form
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Staff member's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="staff@salon.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio (Optional)
                  </label>
                  <textarea
                    value={createForm.bio}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Brief description of expertise and specialties"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={createForm.temporaryPassword}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        temporaryPassword: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If left blank, a temporary password will be generated
                    automatically.
                  </p>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreateForm({
                        name: "",
                        email: "",
                        bio: "",
                        temporaryPassword: "",
                      });
                      setGeneratedPassword(null);
                    }}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateStaff}
                    disabled={
                      isSaving ||
                      !createForm.name.trim() ||
                      !createForm.email.trim()
                    }
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Creating..." : "Create Staff Member"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Management Modal */}
      {isScheduleModalOpen && scheduleStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-5xl">
            <StaffScheduleManagement
              staffId={scheduleStaff.id}
              staffName={scheduleStaff.name}
              onClose={() => {
                setIsScheduleModalOpen(false);
                setScheduleStaff(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
