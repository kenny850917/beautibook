import { Suspense } from "react";
import StaffScheduleContent from "@/components/Staff/StaffScheduleContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Schedule - BeautiBook Staff",
  description: "Personal appointment calendar and availability management",
};

// Loading component for Suspense
function ScheduleLoading() {
  return (
    <div className="h-screen lg:h-auto">
      {/* Mobile loading - full screen */}
      <div className="lg:hidden h-full bg-white">
        <div className="p-4 border-b">
          <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-4 h-full">
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Desktop loading */}
      <div className="hidden lg:block space-y-6 p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default function StaffSchedulePage() {
  return (
    <Suspense fallback={<ScheduleLoading />}>
      <StaffScheduleContent />
    </Suspense>
  );
}

