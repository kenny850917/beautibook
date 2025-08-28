"use client";

import { useState, useEffect } from "react";
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

export default function StaffManagementContent() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load staff and services data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // For MVP, use mock data until API endpoints are created
        // TODO: Replace with actual API calls in Phase 4
        const mockServices: Service[] = [
          { id: "1", name: "Haircut", duration_minutes: 60, base_price: 6500 },
          {
            id: "2",
            name: "Hair Color",
            duration_minutes: 120,
            base_price: 12000,
          },
          {
            id: "3",
            name: "Highlights",
            duration_minutes: 180,
            base_price: 15000,
          },
        ];

        const mockStaff: StaffMember[] = [
          {
            id: "staff1",
            user_id: "user1",
            name: "Sarah Johnson",
            bio: "Senior stylist with 8+ years experience specializing in cuts and color",
            photo_url: null,
            services: ["1", "2", "3"],
            user: { email: "sarah@salon.com", role: UserRole.STAFF },
            serviceDetails: [
              {
                id: "1",
                name: "Haircut",
                base_price: 6500,
                custom_price: 7500,
              },
              { id: "2", name: "Hair Color", base_price: 12000 },
              {
                id: "3",
                name: "Highlights",
                base_price: 15000,
                custom_price: 16500,
              },
            ],
            availabilityCount: 5,
          },
          {
            id: "staff2",
            user_id: "user2",
            name: "Mike Chen",
            bio: "Expert in precision cuts and modern styling techniques",
            photo_url: null,
            services: ["1"],
            user: { email: "mike@salon.com", role: UserRole.STAFF },
            serviceDetails: [{ id: "1", name: "Haircut", base_price: 6500 }],
            availabilityCount: 5,
          },
          {
            id: "staff3",
            user_id: "user3",
            name: "Lisa Rodriguez",
            bio: "Color specialist with expertise in blonde and fashion colors",
            photo_url: null,
            services: ["2", "3"],
            user: { email: "lisa@salon.com", role: UserRole.STAFF },
            serviceDetails: [
              {
                id: "2",
                name: "Hair Color",
                base_price: 12000,
                custom_price: 13000,
              },
              { id: "3", name: "Highlights", base_price: 15000 },
            ],
            availabilityCount: 4,
          },
        ];

        setServices(mockServices);
        setStaff(mockStaff);
      } catch (error) {
        console.error("Error loading staff data:", error);
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
    setIsModalOpen(true);
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
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditStaff(member)}
                  className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]"
                >
                  Edit Details
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]">
                  Schedule
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
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]">
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

      {/* TODO: Add Edit Staff Modal */}
      {isModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              Edit {selectedStaff.name}
            </h3>
            <p className="text-gray-600 mb-4">
              Staff editing functionality will be implemented in the next phase.
            </p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}


