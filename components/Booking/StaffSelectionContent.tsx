"use client";

/**
 * Staff Selection Content
 * Mobile-first staff selection with photos, bios, and individual pricing
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, DollarSign, ArrowRight, ArrowLeft, Users } from "lucide-react";
import Image from "next/image";

interface Staff {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  services: string[];
  customPrice?: number; // Custom price for this service (in cents)
}

interface Service {
  id: string;
  name: string;
  base_price: number;
}

export function StaffSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service");

  const [staff, setStaff] = useState<Staff[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      router.push("/booking");
      return;
    }
    fetchStaffAndService();
  }, [serviceId]);

  const fetchStaffAndService = async () => {
    try {
      // Fetch staff and service data in parallel
      const [staffResponse, serviceResponse] = await Promise.all([
        fetch(`/api/staff?service=${serviceId}`),
        fetch(`/api/services/${serviceId}`),
      ]);

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        setStaff(staffData.staff || []);
      }

      if (serviceResponse.ok) {
        const serviceData = await serviceResponse.json();
        setService(serviceData.service);
      }
    } catch (error) {
      console.error("Error fetching staff and service:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(0)}`;
  };

  const getStaffPrice = (staff: Staff) => {
    return staff.customPrice || service?.base_price || 0;
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId);
    // Navigate to date/time selection
    router.push(`/booking/datetime?service=${serviceId}&staff=${staffId}`);
  };

  const handleBack = () => {
    router.push("/booking");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Service Not Found
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          The selected service could not be found.
        </p>
        <button
          onClick={handleBack}
          className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Choose Another Service
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Service context */}
      <div className="bg-white rounded-lg border border-purple-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{service.name}</h3>
            <p className="text-sm text-gray-500">
              Base price: {formatPrice(service.base_price)}
            </p>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center text-sm text-purple-600 hover:text-purple-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Change Service
          </button>
        </div>
      </div>

      {/* Staff selection */}
      <div className="space-y-4">
        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => handleStaffSelect(member.id)}
            className={`w-full bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200 p-6 text-left group ${
              selectedStaff === member.id
                ? "border-purple-300 shadow-md"
                : "border-purple-100 hover:border-purple-200"
            }`}
            style={{ minHeight: "44px" }} // Ensure touch target minimum
          >
            <div className="flex items-start space-x-4">
              {/* Staff photo */}
              <div className="flex-shrink-0">
                {member.photo_url ? (
                  <Image
                    src={member.photo_url}
                    alt={member.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-100 flex items-center justify-center border-2 border-purple-100">
                    <span className="text-xl font-semibold text-purple-600">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Staff name and rating */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    {member.name}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">4.9</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {member.bio ||
                    "Experienced beauty professional dedicated to making you look and feel your best."}
                </p>

                {/* Pricing and action */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {formatPrice(getStaffPrice(member))}
                    </span>
                    {member.customPrice &&
                      member.customPrice !== service.base_price && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          Special Price
                        </span>
                      )}
                  </div>

                  <ArrowRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {staff.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Staff Available
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            No staff members are currently available for this service.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Choose Another Service
          </button>
        </div>
      )}

      {/* Help text */}
      {staff.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            All our professionals are highly trained and experienced. Choose
            based on availability or preference.
          </p>
        </div>
      )}
    </div>
  );
}
