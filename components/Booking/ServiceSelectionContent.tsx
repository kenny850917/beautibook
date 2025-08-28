"use client";

/**
 * Service Selection Content
 * Mobile-first service selection with large touch targets and clear pricing
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, DollarSign, ArrowRight } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number; // in cents
  description?: string;
}

export function ServiceSelectionContent() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(0)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h`;
  };

  const getServiceDescription = (serviceName: string) => {
    const descriptions: Record<string, string> = {
      Haircut: "Professional cut and styling to enhance your natural beauty",
      "Hair Color": "Full color transformation with premium products",
      Highlights: "Beautiful highlights to add dimension and brightness",
    };
    return descriptions[serviceName] || "Professional beauty service";
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    // Navigate to staff selection with selected service
    router.push(`/booking/staff?service=${serviceId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceSelect(service.id)}
            className={`w-full bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200 p-6 text-left group ${
              selectedService === service.id
                ? "border-pink-300 shadow-md"
                : "border-pink-100 hover:border-pink-200"
            }`}
            style={{ minHeight: "44px" }} // Ensure touch target minimum
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Service name */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                  {service.name}
                </h3>

                {/* Service description */}
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {getServiceDescription(service.name)}
                </p>

                {/* Duration and pricing info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(service.duration_minutes)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Starting at {formatPrice(service.base_price)}</span>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <ArrowRight className="w-5 h-5 text-pink-400 group-hover:text-pink-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Help text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Need help choosing? Our staff will be happy to recommend the perfect
          service for you.
        </p>
      </div>

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-pink-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Services Available
          </h3>
          <p className="text-gray-500 text-sm">
            Please check back later or contact us directly.
          </p>
        </div>
      )}
    </div>
  );
}

