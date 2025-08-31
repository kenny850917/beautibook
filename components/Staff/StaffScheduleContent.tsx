"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import BaseCalendar from "@/components/Calendar/BaseCalendar";
import AppointmentEditModal from "@/components/Common/AppointmentEditModal";
import { format, isToday, isTomorrow, startOfWeek, endOfWeek } from "date-fns";
import { parseIsoToPstComponents } from "@/lib/utils/calendar";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: "booking" | "availability" | "hold";
    staffId: string;
    serviceId?: string;
    customerId?: string;
    status?: "confirmed" | "pending" | "cancelled";
  };
}

interface AppointmentEvent {
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
    status: "confirmed" | "pending" | "cancelled" | "noshow";
    notes?: string;
  };
}

// Local copy of AppointmentDetails interface for modal compatibility
interface AppointmentDetails {
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
    status: "CONFIRMED" | "PENDING" | "CANCELLED" | "NOSHOW";
    notes?: string;
  };
}

interface DayStats {
  appointments: number;
  revenue: number;
  hours: number;
}

interface StaffAppointmentData {
  id: string;
  title: string;
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
  };
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    base_price: number;
  };
}

// Transform AppointmentEvent to CalendarEvent for BaseCalendar compatibility
const transformToCalendarEvents = (
  appointments: AppointmentEvent[]
): CalendarEvent[] => {
  return appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.title,
    start: appointment.start,
    end: appointment.end,
    resource: {
      type: "booking" as const,
      staffId: "current-staff", // Will be replaced with actual staff ID from session
      status: appointment.resource.status as
        | "confirmed"
        | "pending"
        | "cancelled",
    },
  }));
};

// Convert AppointmentEvent to AppointmentDetails for modal compatibility
const convertToAppointmentDetails = (
  appointment: AppointmentEvent
): AppointmentDetails => {
  // Convert lowercase status to uppercase for modal
  const statusMap = {
    confirmed: "CONFIRMED",
    pending: "PENDING",
    cancelled: "CANCELLED",
    noshow: "NOSHOW",
  } as const;

  return {
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
      status:
        statusMap[appointment.resource.status as keyof typeof statusMap] ||
        "CONFIRMED",
      notes: appointment.resource.notes,
    },
  };
};

export default function StaffScheduleContent() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [appointments, setAppointments] = useState<AppointmentEvent[]>([]);
  const [todayStats, setTodayStats] = useState<DayStats>({
    appointments: 0,
    revenue: 0,
    hours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentDetails | null>(null);
  const [currentView, setCurrentView] = useState<"month" | "week" | "day">(
    "day"
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // Load appointments for a specific date range
  const loadAppointments = useCallback(
    async (date: Date) => {
      if (!session?.user?.staffId) return;

      try {
        setIsLoadingAppointments(true);

        // Get the week range for the current calendar view
        const weekStart = startOfWeek(date);
        const weekEnd = endOfWeek(date);

        // Fetch appointments for the specific week using date range
        const response = await fetch(
          `/api/staff/appointments?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }

        const data = await response.json();

        // Transform API data to AppointmentEvent format using timezone-safe parsing
        const realEvents: AppointmentEvent[] = data.appointments.map(
          (appointment: StaffAppointmentData) => {
            // Parse using universal timezone utilities
            const startComponents = parseIsoToPstComponents(
              appointment.slot_datetime
            );
            const startTime = new Date(
              startComponents.date + "T" + startComponents.time
            );
            const endTime = new Date(
              startTime.getTime() +
                appointment.service.duration_minutes * 60 * 1000
            );

            // Convert Prisma enum to lowercase for frontend
            const statusMap = {
              CONFIRMED: "confirmed",
              PENDING: "pending",
              CANCELLED: "cancelled",
              NOSHOW: "noshow",
            } as const;

            return {
              id: appointment.id,
              title: `${appointment.service.name} - ${appointment.customer_name}`,
              start: startTime,
              end: endTime,
              resource: {
                serviceName: appointment.service.name,
                customerName: appointment.customer_name,
                customerPhone: appointment.customer_phone,
                customerEmail: appointment.customer_email || undefined,
                price: appointment.final_price,
                status: statusMap[appointment.status],
                notes: appointment.notes || undefined,
              },
            };
          }
        );

        // Store appointments for modal and convert to calendar events for display
        setAppointments(realEvents);
        const calendarEvents = transformToCalendarEvents(realEvents);
        setEvents(calendarEvents);
      } catch (error) {
        console.error("Error loading appointments:", error);
        setEvents([]);
        setAppointments([]);
      } finally {
        setIsLoadingAppointments(false);
      }
    },
    [session?.user?.staffId]
  );

  // Load today's stats (once on mount)
  useEffect(() => {
    const loadTodayStats = async () => {
      if (!session?.user?.staffId) return;

      try {
        setIsLoading(true);

        // Fetch today's appointments for stats
        const response = await fetch("/api/staff/appointments?status=today");

        if (!response.ok) {
          throw new Error("Failed to fetch today's stats");
        }

        const data = await response.json();

        // Transform and calculate today's stats using timezone-safe parsing
        const todayEvents = data.appointments.map(
          (appointment: StaffAppointmentData) => {
            // Parse using universal timezone utilities
            const startComponents = parseIsoToPstComponents(
              appointment.slot_datetime
            );
            const startTime = new Date(
              startComponents.date + "T" + startComponents.time
            );
            const endTime = new Date(
              startTime.getTime() +
                appointment.service.duration_minutes * 60 * 1000
            );

            return {
              price: appointment.final_price,
              start: startTime,
              end: endTime,
            };
          }
        );

        const stats = {
          appointments: todayEvents.length,
          revenue: todayEvents.reduce(
            (sum: number, event: { price: number; start: Date; end: Date }) =>
              sum + event.price,
            0
          ),
          hours: todayEvents.reduce(
            (sum: number, event: { price: number; start: Date; end: Date }) => {
              const duration =
                (event.end.getTime() - event.start.getTime()) /
                (1000 * 60 * 60);
              return sum + duration;
            },
            0
          ),
        };

        setTodayStats(stats);
      } catch (error) {
        console.error("Error loading today's stats:", error);
        setTodayStats({
          appointments: 0,
          revenue: 0,
          hours: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTodayStats();
  }, [session?.user?.staffId]);

  // Load appointments when calendar date changes
  useEffect(() => {
    loadAppointments(currentDate);
  }, [currentDate, loadAppointments]);

  // Handle saving appointment updates
  const handleSaveAppointment = useCallback(
    async (updatedAppointment: AppointmentDetails) => {
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
          "[STAFF FRONTEND] Sending appointment update data:",
          requestData
        );
        console.log("[STAFF FRONTEND] Data types being sent:", {
          customerName: typeof requestData.customerName,
          customerPhone: typeof requestData.customerPhone,
          customerEmail: typeof requestData.customerEmail,
          price: typeof requestData.price,
          status: typeof requestData.status,
          notes: typeof requestData.notes,
        });

        const response = await fetch(
          `/api/staff/appointments/${updatedAppointment.id}`,
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
          throw new Error(errorData.error || "Failed to update appointment");
        }

        const result = await response.json();
        console.log("Appointment updated successfully:", result);

        // Clear events first to force React to detect changes
        setEvents([]);

        // Reload appointments from server to get fresh data
        console.log("Reloading appointments after update...");
        await loadAppointments(currentDate);
        console.log("Appointments reloaded successfully");

        // Force component refresh - modal will close itself
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error("Error saving appointment:", error);
        throw error; // Let the modal handle the error display
      }
    },
    [currentDate, loadAppointments]
  );

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatPhone = (phone: string): string => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "noshow":
        return "bg-gray-100 text-gray-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTodayAppointments = () => {
    return appointments.filter((appointment) => isToday(appointment.start));
  };

  const getTomorrowAppointments = () => {
    return appointments.filter((appointment) => isTomorrow(appointment.start));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex-1 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="p-4 flex-1 overflow-hidden">
            <div className="h-full bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="hidden lg:block flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View - Full Screen Calendar */}
      <div className="lg:hidden flex-1 bg-white flex flex-col">
        {/* Mobile Stats Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Today&apos;s Schedule
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-purple-600">
                {todayStats.appointments}
              </div>
              <div className="text-xs text-gray-600">Appointments</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(todayStats.revenue)}
              </div>
              <div className="text-xs text-gray-600">Revenue</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {todayStats.hours.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-600">Hours</div>
            </div>
          </div>
        </div>

        {/* Mobile Calendar */}
        <div className="flex-1 p-2 overflow-hidden">
          <BaseCalendar
            key={`mobile-calendar-${refreshKey}`}
            events={events}
            onSelectEvent={(event) => {
              // Find the original appointment by ID and convert for modal
              const appointment = appointments.find((e) => e.id === event.id);
              if (appointment)
                setEditingAppointment(convertToAppointmentDetails(appointment));
            }}
            onNavigate={setCurrentDate}
            defaultView="day"
            views={["day", "week"]}
            className="h-full"
          />
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Desktop Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Today&apos;s Appointments
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {todayStats.appointments}
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
                    Today&apos;s Revenue
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(todayStats.revenue)}
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Working Hours
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {todayStats.hours.toFixed(1)}h
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Calendar */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    My Schedule
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Personal appointment calendar -{" "}
                    {format(currentDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                {isLoadingAppointments && (
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
                key={`desktop-calendar-${refreshKey}`}
                events={events}
                onSelectEvent={(event) => {
                  // Find the original appointment by ID and convert for modal
                  const appointment = appointments.find(
                    (e) => e.id === event.id
                  );
                  if (appointment)
                    setEditingAppointment(
                      convertToAppointmentDetails(appointment)
                    );
                }}
                onNavigate={setCurrentDate}
                defaultView="week"
                views={["month", "week", "day"]}
                className="h-96 lg:h-[600px]"
              />
            </div>
          </div>

          {/* Upcoming Appointments */}
        </div>
      </div>

      {/* Appointment Edit Modal */}
      {editingAppointment && (
        <AppointmentEditModal
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSave={handleSaveAppointment}
          isStaffView={true}
        />
      )}
    </>
  );
}
