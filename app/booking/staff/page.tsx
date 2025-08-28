/**
 * Staff Selection Page
 * Second step of booking flow - choose staff member for selected service
 */

import { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { StaffSelectionContent } from "@/components/Booking/StaffSelectionContent";

export const metadata: Metadata = {
  title: "Choose Your Stylist | BeautiBook",
  description: "Select your preferred stylist for your beauty service",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function StaffSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm border-b border-pink-100">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Choose Your Stylist
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Select your preferred beauty professional
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                Step 2 of 4
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff selection content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<StaffSelectionSkeleton />}>
          <StaffSelectionContent />
        </Suspense>
      </div>

      {/* Mobile progress indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Step 2 of 4</span>
          <div className="flex space-x-1">
            <div className="w-8 h-1 bg-pink-300 rounded-full"></div>
            <div className="w-8 h-1 bg-pink-500 rounded-full"></div>
            <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
            <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffSelectionSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
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
