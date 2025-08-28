/**
 * Booking Success Page
 * Confirmation page showing successful booking details
 */

import { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { BookingSuccessContent } from "@/components/Booking/BookingSuccessContent";

export const metadata: Metadata = {
  title: "Booking Confirmed | BeautiBook",
  description: "Your beauty appointment has been confirmed",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm border-b border-green-100">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Booking Confirmed!
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Your appointment has been successfully booked
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Complete
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<BookingSuccessSkeleton />}>
          <BookingSuccessContent />
        </Suspense>
      </div>
    </div>
  );
}

function BookingSuccessSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success animation skeleton */}
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
      </div>

      {/* Booking details skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="space-y-3">
        <div className="h-12 bg-gray-200 rounded-lg"></div>
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
}
