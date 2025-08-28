"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_bookings: number;
  total_spent: number;
  last_booking_at?: Date;
  preferred_staff?: string;
  preferred_service?: string;
  marketing_consent: boolean;
  created_at: Date;
  notes?: string;
}

interface CustomerWithHistory extends Customer {
  bookings: Array<{
    id: string;
    slot_datetime: Date;
    final_price: number;
    service: {
      name: string;
      duration_minutes: number;
    };
    staff: {
      name: string;
    };
  }>;
}

export default function CustomerCRMContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithHistory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "vip" | "inactive" | "new"
  >("all");
  const [isLoading, setIsLoading] = useState(true);

  // Load customers data
  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);

      // TODO: Replace with actual API call in Phase 4
      const mockCustomers: Customer[] = [
        {
          id: "1",
          name: "Sarah Johnson",
          phone: "+1234567890",
          email: "sarah@example.com",
          total_bookings: 15,
          total_spent: 125000, // $1,250 in cents
          last_booking_at: new Date(2024, 11, 15),
          preferred_staff: "staff_1",
          preferred_service: "service_1",
          marketing_consent: true,
          created_at: new Date(2024, 8, 1),
          notes:
            "[2024-12-01] Prefers morning appointments\n[2024-11-15] Allergic to certain hair products",
        },
        {
          id: "2",
          name: "Mike Chen",
          phone: "+1987654321",
          total_bookings: 3,
          total_spent: 19500, // $195 in cents
          last_booking_at: new Date(2024, 10, 20),
          marketing_consent: false,
          created_at: new Date(2024, 10, 1),
        },
        {
          id: "3",
          name: "Emma Wilson",
          phone: "+1555123456",
          email: "emma@example.com",
          total_bookings: 8,
          total_spent: 64000, // $640 in cents
          last_booking_at: new Date(2024, 9, 10), // Inactive
          marketing_consent: true,
          created_at: new Date(2024, 7, 15),
        },
      ];

      // Filter based on type
      const filteredCustomers = mockCustomers.filter((customer) => {
        switch (filterType) {
          case "vip":
            return customer.total_spent >= 50000; // $500+
          case "inactive":
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return (
              customer.last_booking_at &&
              customer.last_booking_at < thirtyDaysAgo
            );
          case "new":
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return customer.created_at > sevenDaysAgo;
          default:
            return true;
        }
      });

      setCustomers(filteredCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const loadCustomerHistory = async (customerId: string) => {
    try {
      // TODO: Replace with actual API call
      const mockHistory: CustomerWithHistory = {
        ...customers.find((c) => c.id === customerId)!,
        bookings: [
          {
            id: "booking_1",
            slot_datetime: new Date(2024, 11, 15, 10, 0),
            final_price: 6500,
            service: { name: "Haircut", duration_minutes: 60 },
            staff: { name: "Sarah" },
          },
          {
            id: "booking_2",
            slot_datetime: new Date(2024, 10, 20, 14, 30),
            final_price: 12000,
            service: { name: "Hair Color", duration_minutes: 120 },
            staff: { name: "Lisa" },
          },
        ],
      };

      setSelectedCustomer(mockHistory);
    } catch (error) {
      console.error("Error loading customer history:", error);
    }
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getCustomerSegment = (customer: Customer): string => {
    if (customer.total_spent >= 100000) return "VIP"; // $1000+
    if (customer.total_spent >= 50000) return "Gold"; // $500+
    if (customer.total_bookings >= 5) return "Regular";
    return "New";
  };

  const getSegmentColor = (segment: string): string => {
    switch (segment) {
      case "VIP":
        return "bg-purple-100 text-purple-800";
      case "Gold":
        return "bg-yellow-100 text-yellow-800";
      case "Regular":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer CRM</h2>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(
                e.target.value as "all" | "vip" | "inactive" | "new"
              )
            }
            className="block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-purple-500 focus:outline-none focus:ring-purple-500"
          >
            <option value="all">All Customers</option>
            <option value="vip">VIP Customers</option>
            <option value="inactive">Inactive (30+ days)</option>
            <option value="new">New (7 days)</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Customers
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {customers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(
                  customers.reduce((sum, c) => sum + c.total_spent, 0)
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">
                {customers.length > 0
                  ? (
                      customers.reduce((sum, c) => sum + c.total_bookings, 0) /
                      customers.length
                    ).toFixed(1)
                  : "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Email Consent</p>
              <p className="text-2xl font-semibold text-gray-900">
                {customers.filter((c) => c.marketing_consent).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="max-w-md">
          <label htmlFor="search" className="sr-only">
            Search customers
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Search by name, phone, or email..."
            />
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredCustomers.map((customer) => (
            <li key={customer.id}>
              <button
                onClick={() => loadCustomerHistory(customer.id)}
                className="w-full text-left px-4 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {customer.name[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {customer.name}
                        </p>
                        <span
                          className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSegmentColor(
                            getCustomerSegment(customer)
                          )}`}
                        >
                          {getCustomerSegment(customer)}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <span>{customer.phone}</span>
                        {customer.email && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{customer.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(customer.total_spent)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {customer.total_bookings} booking
                      {customer.total_bookings !== 1 ? "s" : ""}
                    </p>
                    {customer.last_booking_at && (
                      <p className="text-xs text-gray-400">
                        Last:{" "}
                        {format(
                          new Date(customer.last_booking_at),
                          "MMM d, yyyy"
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Customer Details
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {selectedCustomer.name}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2">{selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2">
                      {selectedCustomer.email || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Spent:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(selectedCustomer.total_spent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Bookings:</span>
                    <span className="ml-2">
                      {selectedCustomer.total_bookings}
                    </span>
                  </div>
                </div>
              </div>

              {/* Booking History */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Booking History
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCustomer.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border rounded p-3 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{booking.service.name}</p>
                          <p className="text-gray-500">
                            with {booking.staff.name}
                          </p>
                          <p className="text-gray-500">
                            {format(
                              new Date(booking.slot_datetime),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(booking.final_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedCustomer.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-line">
                    {selectedCustomer.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
