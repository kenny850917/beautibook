import { Metadata } from "next";
import CustomerCRMContent from "@/components/Admin/CustomerCRMContent";

export const metadata: Metadata = {
  title: "Customer CRM - Admin Dashboard | BeautiBook",
  description:
    "Manage guest customers, track booking history, and analyze customer data for your beauty salon.",
};

/**
 * Admin Customer Management Page
 *
 * Provides comprehensive customer relationship management for salon admins:
 * - Guest customer tracking and identification
 * - Customer segmentation and analytics
 * - Booking history and spending patterns
 * - Marketing consent and communication preferences
 *
 * Features:
 * - Search customers by name, phone, or email
 * - Filter by customer segments (VIP, Gold, Regular, New)
 * - View detailed customer profiles with booking history
 * - Track customer lifetime value and preferences
 * - Identify inactive customers for re-engagement
 */
export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Track guest customers, analyze booking patterns, and manage
              relationships
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export Data
            </button>

            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <div>
              <a href="/admin" className="text-gray-400 hover:text-gray-500">
                <svg
                  className="flex-shrink-0 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="sr-only">Admin Dashboard</span>
              </a>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg
                className="flex-shrink-0 h-5 w-5 text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="ml-2 text-sm font-medium text-gray-500">
                Customer CRM
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Customer CRM Content */}
      <CustomerCRMContent />
    </div>
  );
}

