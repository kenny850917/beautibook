import { Suspense } from "react";
import AdminDashboardContent from "@/components/Admin/AdminDashboardContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - BeautiBook",
  description: "Salon management dashboard for administrators",
};

// Loading component for Suspense
function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stats loading skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Calendar loading skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="h-96 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Dashboard Overview
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Monitor salon operations and manage bookings
        </p>
      </div>

      <Suspense fallback={<DashboardLoading />}>
        <AdminDashboardContent />
      </Suspense>
    </div>
  );
}




