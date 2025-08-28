/**
 * Booking Confirmation Page
 * Final step of booking flow - customer details and confirmation with hold countdown
 */

import { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { BookingConfirmContent } from "@/components/Booking/BookingConfirmContent";

export const metadata: Metadata = {
  title: "Confirm Your Booking | BeautiBook",
  description: "Enter your details and confirm your beauty appointment",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function BookingConfirmPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm border-b border-pink-100">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Confirm Your Booking
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Enter your details to complete your appointment
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                Step 4 of 4
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking confirmation content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<BookingConfirmSkeleton />}>
          <BookingConfirmContent />
        </Suspense>
      </div>

      {/* Mobile progress indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Step 4 of 4</span>
          <div className="flex space-x-1">
            <div className="w-8 h-1 bg-pink-300 rounded-full"></div>
            <div className="w-8 h-1 bg-pink-300 rounded-full"></div>
            <div className="w-8 h-1 bg-pink-300 rounded-full"></div>
            <div className="w-8 h-1 bg-pink-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingConfirmSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hold countdown skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Booking summary skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Form skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-4">
          <div>
            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-12 bg-gray-100 rounded-lg"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-12 bg-gray-100 rounded-lg"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
