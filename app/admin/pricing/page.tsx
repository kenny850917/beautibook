import { Suspense } from "react";
import PricingManagementContent from "@/components/Admin/PricingManagementContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Management - BeautiBook Admin",
  description: "Manage salon service pricing and staff overrides",
};

// Loading component for Suspense
function PricingManagementLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Pricing table skeleton */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-6 flex items-center justify-between">
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
    </div>
  );
}

export default function PricingManagementPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Pricing Management
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage base salon pricing and staff-specific overrides
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {/* Buttons moved to PricingManagementContent for better state management */}
          </div>
        </div>
      </div>

      <Suspense fallback={<PricingManagementLoading />}>
        <PricingManagementContent />
      </Suspense>
    </div>
  );
}
