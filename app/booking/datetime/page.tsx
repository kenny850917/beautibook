/**
 * Date & Time Selection Page
 * Third step of booking flow - choose appointment date and time
 */

import { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DateTimeSelectionContent } from "@/components/Booking/DateTimeSelectionContent";

export const metadata: Metadata = {
  title: "Choose Date & Time | BeautiBook",
  description: "Select your preferred appointment date and time",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function DateTimeSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm border-b border-pink-100">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Choose Date & Time
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Select your preferred appointment slot
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                Step 3 of 4
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Date & time selection content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<DateTimeSelectionSkeleton />}>
          <DateTimeSelectionContent />
        </Suspense>
      </div>

      {/* Mobile progress indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Step 3 of 4</span>
          <div className="flex space-x-1">
            <div className="w-8 h-1 bg-pink-300 rounded-full"></div>
            <div className="w-8 h-1 bg-pink-300 rounded-full"></div>
            <div className="w-8 h-1 bg-pink-500 rounded-full"></div>
            <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DateTimeSelectionSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>

        {/* Time slots skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
