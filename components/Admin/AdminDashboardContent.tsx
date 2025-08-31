"use client";

import { useState, useEffect, useCallback } from "react";
import BaseCalendar from "@/components/Calendar/BaseCalendar";
import AppointmentEditModal from "@/components/Common/AppointmentEditModal";
import { format, startOfWeek, endOfWeek } from "date-fns";
import {
  parseIsoToPstComponents,
  createCalendarEvent,
  getTodayPst,
  createPstDateTime,
} from "@/lib/utils/calendar";
import { parseISO } from "date-fns";

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
    status?: "confirmed" | "pending" | "cancelled"; // Match BaseCalendar expectations (lowercase)
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
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "NOSHOW";
  notes: string | null;
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

interface AdminAppointmentEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    serviceName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    price: number;
    status: "CONFIRMED" | "PENDING" | "CANCELLED" | "NOSHOW"; // Match database enum format
    notes?: string;
    staffId: string;
    staffName: string;
  };
}

export default function AdminDashboardContent() {
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize with PST today
    const todayPstIso = createPstDateTime(getTodayPst(), "12:00");
    return parseISO(todayPstIso);
  });
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    weeklyRevenue: 0,
    activeStaff: 0,
    pendingHolds: 0,
  });
  const [events, setEvents] = useState<AdminCalendarEvent[]>([]);
  const [adminAppointments, setAdminAppointments] = useState<
    AdminAppointmentEvent[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: {
      serviceName: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      price: number;
      status: "CONFIRMED" | "PENDING" | "CANCELLED" | "NOSHOW"; // Match database enum format
      notes?: string;
      staffId?: string;
      staffName?: string;
    };
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load bookings for a specific date range
  const loadBookings = useCallback(async (date: Date) => {
    try {
      setIsLoadingBookings(true);

      // Get the week range for the current calendar view
      const weekStart = startOfWeek(date);
      const weekEnd = endOfWeek(date);

      // Fetch bookings for the specific week using date range
      const bookingsResponse = await fetch(
        `/api/admin/bookings?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      );

      if (!bookingsResponse.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const bookingsData = await bookingsResponse.json();

      // Convert bookings to calendar events using timezone-safe parsing
      const calendarEvents: AdminCalendarEvent[] = bookingsData.bookings.map(
        (booking: BookingData) => {
          // Use timezone-safe calendar event creation
          const calendarEvent = createCalendarEvent({
            slot_datetime: booking.slot_datetime,
            service: booking.service,
            customer_name: booking.customer_name,
          });

          const startTime = calendarEvent.start;
          const endTime = calendarEvent.end;

          // Convert database status (uppercase) to calendar format (lowercase)
          const calendarStatusMap = {
            CONFIRMED: "confirmed",
            PENDING: "pending",
            CANCELLED: "cancelled",
            NOSHOW: "cancelled", // Treat no-show as cancelled for calendar display
          } as const;

          const calendarStatus =
            calendarStatusMap[booking.status] || "confirmed";
          console.log(
            `[ADMIN CALENDAR] Converting status: ${booking.status} → ${calendarStatus} for ${booking.customer_name}`
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
              status: calendarStatus,
            },
          };
        }
      );

      // Convert bookings to admin appointment events for the edit modal using timezone-safe parsing
      const appointmentEvents: AdminAppointmentEvent[] =
        bookingsData.bookings.map((booking: BookingData) => {
          // Use timezone-safe calendar event creation
          const calendarEvent = createCalendarEvent({
            slot_datetime: booking.slot_datetime,
            service: booking.service,
            customer_name: booking.customer_name,
          });

          const startTime = calendarEvent.start;
          const endTime = calendarEvent.end;

          return {
            id: booking.id,
            title: `${booking.service.name} - ${booking.customer_name}`,
            start: startTime,
            end: endTime,
            resource: {
              serviceName: booking.service.name,
              customerName: booking.customer_name,
              customerPhone: booking.customer_phone,
              customerEmail: booking.customer_email || undefined,
              price: booking.final_price,
              status: booking.status, // Pass raw database status to modal for proper conversion
              notes: booking.notes || undefined,
              staffId: booking.staff_id,
              staffName: booking.staff.name,
            },
          };
        });

      setEvents(calendarEvents);
      setAdminAppointments(appointmentEvents);
    } catch (error) {
      console.error("Error loading bookings:", error);
      setEvents([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  // Load dashboard stats (once on mount)
  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setIsLoading(true);

        const statsResponse = await fetch("/api/admin/stats");

        if (!statsResponse.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        const statsData = await statsResponse.json();

        // Update stats from real API data
        const realStats: DashboardStats = {
          todayBookings: statsData.stats.todayBookings,
          weeklyRevenue: statsData.stats.weeklyRevenue,
          activeStaff: statsData.stats.activeStaff,
          pendingHolds: statsData.stats.pendingHolds,
        };

        setStats(realStats);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);

        // Fallback to empty data on error
        setStats({
          todayBookings: 0,
          weeklyRevenue: 0,
          activeStaff: 0,
          pendingHolds: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  // Load bookings when calendar date changes
  useEffect(() => {
    loadBookings(currentDate);
  }, [currentDate, loadBookings]);

  // Handle saving appointment updates
  const handleSaveAppointment = useCallback(
    async (updatedAppointment: {
      id: string;
      title: string;
      start: Date;
      end: Date;
      resource: {
        serviceName: string;
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
        price: number;
        status: "CONFIRMED" | "PENDING" | "CANCELLED" | "NOSHOW"; // Match database enum format
        notes?: string;
        staffId?: string;
        staffName?: string;
      };
    }) => {
      try {
        const requestData = {
          customerName: updatedAppointment.resource.customerName,
          customerPhone: updatedAppointment.resource.customerPhone,
          customerEmail: updatedAppointment.resource.customerEmail || "",
          price: updatedAppointment.resource.price,
          status: updatedAppointment.resource.status, // Status is already in correct database format
          notes: updatedAppointment.resource.notes || "",
        };

        console.log(
          "[ADMIN FRONTEND] Sending booking update data:",
          requestData
        );
        console.log("[ADMIN FRONTEND] Data types being sent:", {
          customerName: typeof requestData.customerName,
          customerPhone: typeof requestData.customerPhone,
          customerEmail: typeof requestData.customerEmail,
          price: typeof requestData.price,
          status: typeof requestData.status,
          notes: typeof requestData.notes,
        });

        const response = await fetch(
          `/api/admin/bookings/${updatedAppointment.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API Error:", errorData);
          throw new Error(errorData.error || "Failed to update booking");
        }

        const result = await response.json();
        console.log("Booking updated successfully:", result);

        // Clear events first to force React to detect changes
        setEvents([]);
        setAdminAppointments([]);

        // Reload bookings from server to get fresh data
        console.log("Reloading bookings after update...");
        await loadBookings(currentDate);
        console.log("Bookings reloaded successfully");

        // Force component refresh - modal will close itself
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error("Error saving booking:", error);
        throw error; // Let the modal handle the error display
      }
    },
    [currentDate, loadBookings]
  );

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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Master Calendar - Week of{" "}
                {format(startOfWeek(currentDate), "MMM d")} -{" "}
                {format(endOfWeek(currentDate), "MMM d, yyyy")}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                All staff bookings and schedules
              </p>
            </div>
            {isLoadingBookings && (
              <div className="flex items-center text-sm text-gray-500">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading appointments...
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <BaseCalendar
            key={`admin-calendar-${refreshKey}`}
            events={events}
            onSelectEvent={(event) => {
              // Find the original appointment by ID
              const appointment = adminAppointments.find(
                (e) => e.id === event.id
              );
              if (appointment) {
                // Map AdminAppointmentEvent to modal's expected type
                setEditingAppointment({
                  id: appointment.id,
                  title: appointment.title,
                  start: appointment.start,
                  end: appointment.end,
                  resource: {
                    serviceName: appointment.resource.serviceName,
                    customerName: appointment.resource.customerName,
                    customerPhone: appointment.resource.customerPhone,
                    customerEmail: appointment.resource.customerEmail,
                    price: appointment.resource.price,
                    status: appointment.resource.status,
                    notes: appointment.resource.notes,
                    staffId: appointment.resource.staffId,
                    staffName: appointment.resource.staffName,
                  },
                });
              }
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

      {/* Appointment Edit Modal */}
      {editingAppointment && (
        <AppointmentEditModal
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSave={handleSaveAppointment}
          isStaffView={false}
        />
      )}
    </div>
  );
}
