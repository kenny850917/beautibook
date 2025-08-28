"use client";

import { useState, useEffect } from "react";
import BaseCalendar from "@/components/Calendar/BaseCalendar";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface DashboardStats {
  todayBookings: number;
  weeklyRevenue: number;
  activeStaff: number;
  pendingHolds: number;
}

interface AdminCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "booking" | "availability" | "hold";
    staffId: string;
    serviceId?: string;
    customerId?: string;
    status?: "confirmed" | "pending" | "cancelled";
  };
}

interface BookingData {
  id: string;
  staff_id: string;
  service_id: string;
  slot_datetime: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_id: string | null;
  final_price: number;
  created_at: string;
  staff: {
    id: string;
    name: string;
    photo_url: string | null;
  };
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    base_price: number;
  };
}

export default function AdminDashboardContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    weeklyRevenue: 0,
    activeStaff: 0,
    pendingHolds: 0,
  });
  const [events, setEvents] = useState<AdminCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch real dashboard stats and bookings
        const [statsResponse, bookingsResponse] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/bookings?status=week"),
        ]);

        if (!statsResponse.ok || !bookingsResponse.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const statsData = await statsResponse.json();
        const bookingsData = await bookingsResponse.json();

        // Update stats from real API data
        const realStats: DashboardStats = {
          todayBookings: statsData.stats.todayBookings,
          weeklyRevenue: statsData.stats.weeklyRevenue,
          activeStaff: statsData.stats.activeStaff,
          pendingHolds: statsData.stats.pendingHolds,
        };

        // Convert real bookings to calendar events
        const realEvents: AdminCalendarEvent[] = bookingsData.bookings.map(
          (booking: BookingData) => {
            const startTime = new Date(booking.slot_datetime);
            const endTime = new Date(
              startTime.getTime() + booking.service.duration_minutes * 60 * 1000
            );

            return {
              id: booking.id,
              title: `${booking.service.name} - ${booking.customer_name}`,
              start: startTime,
              end: endTime,
              resource: {
                type: "booking" as const,
                staffId: booking.staff_id,
                serviceId: booking.service_id,
                customerId: booking.customer_id,
                status: "confirmed" as const,
              },
            };
          }
        );

        setStats(realStats);
        setEvents(realEvents);
      } catch (error) {
        console.error("Error loading dashboard data:", error);

        // Fallback to empty data on error
        setStats({
          todayBookings: 0,
          weeklyRevenue: 0,
          activeStaff: 0,
          pendingHolds: 0,
        });
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [currentDate]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-lg shadow animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-sm font-medium text-gray-600">
                Today&apos;s Bookings
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.todayBookings}
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
              <p className="text-sm font-medium text-gray-600">
                Weekly Revenue
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.weeklyRevenue)}
              </p>
            </div>
          </div>
        </div>

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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.activeStaff}
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Holds</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.pendingHolds}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Master Calendar */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Master Calendar - Week of{" "}
            {format(startOfWeek(currentDate), "MMM d")} -{" "}
            {format(endOfWeek(currentDate), "MMM d, yyyy")}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            All staff bookings and schedules
          </p>
        </div>

        <div className="p-6">
          <BaseCalendar
            events={events}
            onSelectEvent={(event) => {
              // Handle event selection - show booking details
              console.log("Selected event:", event);
            }}
            onSelectSlot={(slotInfo) => {
              // Handle slot selection - create new booking
              console.log("Selected slot:", slotInfo);
            }}
            onNavigate={(newDate) => {
              setCurrentDate(newDate);
            }}
            defaultView="week"
            views={["month", "week", "day"]}
            className="h-96 lg:h-[600px]"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]">
            <svg
              className="h-5 w-5 mr-2 text-gray-500"
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
            Add Staff Member
          </button>

          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]">
            <svg
              className="h-5 w-5 mr-2 text-gray-500"
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
            Manual Booking
          </button>

          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]">
            <svg
              className="h-5 w-5 mr-2 text-gray-500"
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
            Update Pricing
          </button>

          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px]">
            <svg
              className="h-5 w-5 mr-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}
