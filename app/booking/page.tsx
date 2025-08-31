/**
 * Service Selection Page
 * Customer booking flow entry point - mobile-first service selection
 */

import { Metadata, Viewport } from "next";
import { ServiceSelectionContent } from "@/components/Booking/ServiceSelectionContent";

export const metadata: Metadata = {
  title: "Book a Service | BeautiBook",
  description: "Choose your beauty service and start booking your appointment",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function ServiceSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm border-b border-purple-100">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Book Your Service
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Choose your beauty service to get started
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Step 1 of 4
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Service selection content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <ServiceSelectionContent />
      </div>

      {/* Mobile progress indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-purple-100 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Step 1 of 4</span>
          <div className="flex space-x-1">
            <div className="w-8 h-1 bg-purple-500 rounded-full"></div>
            <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
            <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
            <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
