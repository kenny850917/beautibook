import { Metadata } from "next";
import { Suspense } from "react";
import CustomerCRMContent from "@/components/Admin/CustomerCRMContent";

// Server Component metadata following frontend.mdc
export const metadata: Metadata = {
  title: "Customer CRM - BeautiBook Admin",
  description:
    "Manage salon customers, view booking history, and track customer analytics",
  robots: {
    index: false, // Admin pages should not be indexed
    follow: false,
  },
};

// Loading component for Suspense boundary following frontend.mdc
function CustomerCRMLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="mt-4 sm:mt-0 h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Search skeleton */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="h-10 bg-gray-200 rounded w-full max-w-md animate-pulse"></div>
      </div>

      {/* Customer list skeleton */}
      <div className="bg-white shadow rounded-lg">
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error boundary component following frontend.mdc
function CustomerCRMError() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto max-w-md">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.954-.833-2.724 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error loading customer data
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          There was a problem loading the customer management interface.
        </p>
        <div className="mt-6">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

// Breadcrumb navigation following frontend.mdc mobile-first design
function CustomerBreadcrumb() {
  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4">
        <li>
          <div>
            <a
              href="/admin"
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg
                className="flex-shrink-0 h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z" />
              </svg>
              <span className="sr-only">Admin Dashboard</span>
            </a>
          </div>
        </li>
        <li>
          <div className="flex items-center">
            <svg
              className="flex-shrink-0 h-5 w-5 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="ml-4 text-sm font-medium text-gray-900">
              Customer CRM
            </span>
          </div>
        </li>
      </ol>
    </nav>
  );
}

// Main Server Component following frontend.mdc App Router patterns
export default function CustomerManagementPage() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb Navigation */}
        <CustomerBreadcrumb />

        {/* Page Content with Suspense Boundary */}
        <Suspense fallback={<CustomerCRMLoading />}>
          <div className="space-y-6">
            {/* Error Boundary would go here in production */}
            <CustomerCRMContent />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

// Loading page for Next.js file-based loading states
export function Loading() {
  return <CustomerCRMLoading />;
}

// Error page for Next.js file-based error handling
export function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CustomerBreadcrumb />
        <CustomerCRMError />
      </div>
    </div>
  );
}
