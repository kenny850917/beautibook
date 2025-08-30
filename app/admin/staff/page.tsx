import { Suspense } from "react";
import StaffManagementContent from "@/components/Admin/StaffManagementContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Management - BeautiBook Admin",
  description: "Manage salon staff, services, and pricing",
};

// Loading component for Suspense
function StaffManagementLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Staff grid skeleton */}
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
    </div>
  );
}

export default function StaffManagementPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Staff Management
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage salon staff, services, pricing, and schedules
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<StaffManagementLoading />}>
        <StaffManagementContent />
      </Suspense>
    </div>
  );
}


