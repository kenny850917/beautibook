"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import BaseCalendar from "@/components/Calendar/BaseCalendar";
import { format, isToday, isTomorrow } from "date-fns";

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
    price: number;
    status: "confirmed" | "pending" | "completed";
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
      status:
        appointment.resource.status === "completed"
          ? "confirmed"
          : (appointment.resource.status as
              | "confirmed"
              | "pending"
              | "cancelled"),
    },
  }));
};

export default function StaffScheduleContent() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [todayStats, setTodayStats] = useState<DayStats>({
    appointments: 0,
    revenue: 0,
    hours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(
    null
  );
  const [currentView, setCurrentView] = useState<"month" | "week" | "day">(
    "day"
  );

  // Load staff appointments
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setIsLoading(true);

        // Fetch real staff appointments from API
        const response = await fetch("/api/staff/appointments?status=all");

        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }

        const data = await response.json();

        // Transform API data to AppointmentEvent format
        const realEvents: AppointmentEvent[] = data.appointments.map(
          (appointment: StaffAppointmentData) => {
            const startTime = new Date(appointment.slot_datetime);
            const endTime = new Date(
              startTime.getTime() +
                appointment.service.duration_minutes * 60 * 1000
            );

            return {
              id: appointment.id,
              title: `${appointment.service.name} - ${appointment.customer_name}`,
              start: startTime,
              end: endTime,
              resource: {
                serviceName: appointment.service.name,
                customerName: appointment.customer_name,
                customerPhone: appointment.customer_phone,
                price: appointment.final_price,
                status: "confirmed", // All real bookings are confirmed
                notes: undefined, // Notes not implemented yet
              },
            };
          }
        );

        // Calculate today's stats from real data
        const todayEvents = realEvents.filter((event) => isToday(event.start));

        const stats = {
          appointments: todayEvents.length,
          revenue: todayEvents.reduce(
            (sum, event) => sum + event.resource.price,
            0
          ),
          hours: todayEvents.reduce((sum, event) => {
            const duration =
              (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);
            return sum + duration;
          }, 0),
        };

        setEvents(realEvents);
        setTodayStats(stats);
      } catch (error) {
        console.error("Error loading appointments:", error);

        // Fallback to empty data on error
        setEvents([]);
        setTodayStats({
          appointments: 0,
          revenue: 0,
          hours: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, [currentDate, session?.user?.staffId]);

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
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTodayAppointments = () => {
    return events.filter((event) => isToday(event.start));
  };

  const getTomorrowAppointments = () => {
    return events.filter((event) => isTomorrow(event.start));
  };

  if (isLoading) {
    return (
      <div className="h-screen lg:h-auto">
        <div className="lg:hidden h-full bg-white">
          <div className="p-4 border-b">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="p-4 h-full">
            <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="hidden lg:block space-y-6 p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View - Full Screen Calendar */}
      <div className="lg:hidden h-screen bg-white">
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
        <div className="flex-1 p-2">
          <BaseCalendar
            events={transformToCalendarEvents(events)}
            onSelectEvent={(event) => {
              // Find the original appointment by ID
              const appointment = events.find((e) => e.id === event.id);
              if (appointment) setSelectedEvent(appointment);
            }}
            onNavigate={setCurrentDate}
            defaultView="day"
            views={["day", "week"]}
            className="h-full"
          />
        </div>

        {/* Mobile Quick Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setCurrentView("day")}
              className={`px-3 py-2 rounded-md text-sm font-medium min-h-[44px] ${
                currentView === "day"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setCurrentView("week")}
              className={`px-3 py-2 rounded-md text-sm font-medium min-h-[44px] ${
                currentView === "week"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              Week
            </button>
            <button className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium min-h-[44px]">
              Available
            </button>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block space-y-6 p-6">
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
            <h3 className="text-lg font-medium text-gray-900">My Schedule</h3>
            <p className="mt-1 text-sm text-gray-600">
              Personal appointment calendar -{" "}
              {format(currentDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>

          <div className="p-6">
            <BaseCalendar
              events={transformToCalendarEvents(events)}
              onSelectEvent={(event) => {
                // Find the original appointment by ID
                const appointment = events.find((e) => e.id === event.id);
                if (appointment) setSelectedEvent(appointment);
              }}
              onNavigate={setCurrentDate}
              defaultView="week"
              views={["month", "week", "day"]}
              className="h-96 lg:h-[600px]"
            />
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Today&apos;s Appointments
              </h3>
            </div>
            <div className="p-6">
              {getTodayAppointments().length > 0 ? (
                <div className="space-y-3">
                  {getTodayAppointments().map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {appointment.resource.customerName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {appointment.resource.serviceName}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            appointment.resource.status
                          )}`}
                        >
                          {appointment.resource.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>
                          {format(appointment.start, "h:mm a")} -{" "}
                          {format(appointment.end, "h:mm a")}
                        </p>
                        <p>{formatPhone(appointment.resource.customerPhone)}</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(appointment.resource.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No appointments today
                </p>
              )}
            </div>
          </div>

          {/* Tomorrow */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Tomorrow&apos;s Appointments
              </h3>
            </div>
            <div className="p-6">
              {getTomorrowAppointments().length > 0 ? (
                <div className="space-y-3">
                  {getTomorrowAppointments().map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {appointment.resource.customerName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {appointment.resource.serviceName}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            appointment.resource.status
                          )}`}
                        >
                          {appointment.resource.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>
                          {format(appointment.start, "h:mm a")} -{" "}
                          {format(appointment.end, "h:mm a")}
                        </p>
                        <p>{formatPhone(appointment.resource.customerPhone)}</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(appointment.resource.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No appointments tomorrow
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Appointment Details
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
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
              <div>
                <h4 className="font-medium text-gray-900">
                  {selectedEvent.resource.customerName}
                </h4>
                <p className="text-sm text-gray-600">
                  {formatPhone(selectedEvent.resource.customerPhone)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Service</p>
                <p className="text-sm text-gray-900">
                  {selectedEvent.resource.serviceName}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Time</p>
                <p className="text-sm text-gray-900">
                  {format(selectedEvent.start, "EEEE, MMMM d, yyyy")} at{" "}
                  {format(selectedEvent.start, "h:mm a")} -{" "}
                  {format(selectedEvent.end, "h:mm a")}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Price</p>
                <p className="text-sm text-gray-900">
                  {formatCurrency(selectedEvent.resource.price)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    selectedEvent.resource.status
                  )}`}
                >
                  {selectedEvent.resource.status}
                </span>
              </div>

              {selectedEvent.resource.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Notes</p>
                  <p className="text-sm text-gray-900">
                    {selectedEvent.resource.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 min-h-[44px]"
              >
                Close
              </button>
              <button className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 min-h-[44px]">
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
