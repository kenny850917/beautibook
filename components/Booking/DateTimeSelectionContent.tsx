"use client";

/**
 * Date & Time Selection Content
 * Mobile-native calendar and time slot selection with real-time availability
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isAfter,
  startOfDay,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
}

interface Staff {
  id: string;
  name: string;
  photo_url: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
  datetime: string;
}

export function DateTimeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service");
  const staffId = searchParams.get("staff");

  const [service, setService] = useState<Service | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loadingServiceAndStaff, setLoadingServiceAndStaff] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [processingTimeSlot, setProcessingTimeSlot] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [dateAutoSelected, setDateAutoSelected] = useState(false);

  useEffect(() => {
    if (!serviceId || !staffId) {
      router.push("/booking");
      return;
    }
    fetchServiceAndStaff();

    // Check for selected date in URL params
    const dateParam = searchParams.get("date");
    if (dateParam) {
      try {
        const urlDate = parseISO(dateParam);
        if (!isNaN(urlDate.getTime()) && isDateAvailable(urlDate)) {
          setSelectedDate(urlDate);
          setCurrentDate(urlDate); // Also update calendar view to show this month
          setDateAutoSelected(true);

          // Clear the auto-selected notice after a few seconds
          setTimeout(() => setDateAutoSelected(false), 3000);
        }
      } catch (error) {
        console.warn("Invalid date in URL:", dateParam);
      }
    }
  }, [serviceId, staffId, searchParams]);

  useEffect(() => {
    if (selectedDate && serviceId && staffId) {
      fetchAvailableSlots();
    }
  }, [selectedDate, serviceId, staffId]);

  // Auto-refresh availability every 30 seconds to catch hold changes
  useEffect(() => {
    if (!selectedDate || !serviceId || !staffId) return;

    const refreshInterval = setInterval(() => {
      fetchAvailableSlots();
    }, 30000); // Refresh every 30 seconds

    // Also refresh when page gains focus (user comes back from another tab)
    const handleFocus = () => {
      fetchAvailableSlots();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedDate, serviceId, staffId]);

  const fetchServiceAndStaff = async () => {
    try {
      const [serviceResponse, staffResponse] = await Promise.all([
        fetch(`/api/services/${serviceId}`),
        fetch(`/api/staff/${staffId}`),
      ]);

      if (serviceResponse.ok) {
        const serviceData = await serviceResponse.json();
        setService(serviceData.service);
      }

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        setStaff(staffData.staff);
      }
    } catch (error) {
      console.error("Error fetching service and staff:", error);
    } finally {
      setLoadingServiceAndStaff(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !serviceId || !staffId) return;

    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      // Add cache-busting timestamp to prevent stale data
      const timestamp = Date.now();
      const response = await fetch(
        `/api/availability?date=${dateStr}&service=${serviceId}&staff=${staffId}&_t=${timestamp}`,
        {
          cache: "no-store", // Prevent caching of availability data
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.slots || []);
      }
    } catch (error) {
      console.error("Error fetching available slots:", error);
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setDateAutoSelected(false); // Clear auto-selected notice when user manually selects

    // Update URL with selected date for persistence on refresh
    const dateStr = format(date, "yyyy-MM-dd");
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("date", dateStr);
    router.replace(`/booking/datetime?${newParams.toString()}`, {
      scroll: false,
    });
  };

  const handleTimeSelect = async (timeSlot: TimeSlot) => {
    if (!timeSlot.available || processingTimeSlot) return;

    setSelectedTime(timeSlot.time);
    setProcessingTimeSlot(timeSlot.time);

    try {
      // Validate slot is still available before proceeding
      const response = await fetch(
        `/api/availability/validate?staffId=${staffId}&serviceId=${serviceId}&datetime=${encodeURIComponent(
          timeSlot.datetime
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to validate slot availability");
      }

      const data = await response.json();

      if (data.available) {
        // Slot is still available, proceed to confirmation
        router.push(
          `/booking/confirm?service=${serviceId}&staff=${staffId}&datetime=${timeSlot.datetime}`
        );
      } else {
        // Slot was taken, show error and refresh availability
        setError(
          "This time slot is no longer available. Please select another time."
        );
        setProcessingTimeSlot(null);
        setSelectedTime("");

        // Refresh availability for the selected date
        if (selectedDate) {
          fetchAvailableSlots();
        }
      }
    } catch (error) {
      console.error("Error validating slot:", error);
      setError("Unable to verify slot availability. Please try again.");
      setProcessingTimeSlot(null);
      setSelectedTime("");
    }
  };

  const handleBack = () => {
    router.push(`/booking/staff?service=${serviceId}`);
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Get the start of the calendar grid (includes previous month's trailing days)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 0 = Sunday

    // Get the end of the calendar grid (includes next month's leading days)
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const formatTime = (time: string) => {
    try {
      // Handle different time formats
      if (!time) return "";

      // If it's already formatted (contains AM/PM), return as-is
      if (time.includes("AM") || time.includes("PM")) {
        return time;
      }

      // If it's already a full datetime string, parse directly
      if (time.includes("T") || time.includes(" ")) {
        return format(parseISO(time), "h:mm a");
      }

      // If it's just time (e.g., "09:00" or "09:00:00"), create a date
      const timeWithSeconds = time.length === 5 ? `${time}:00` : time;
      return format(parseISO(`2000-01-01T${timeWithSeconds}`), "h:mm a");
    } catch (error) {
      console.error("Error formatting time:", time, error);
      return time; // Return original string as fallback
    }
  };

  const isDateAvailable = (date: Date) => {
    return isAfter(date, startOfDay(new Date())) || isSameDay(date, new Date());
  };

  // Show loading state while fetching service and staff data
  if (loadingServiceAndStaff) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Loading skeleton for booking context */}
        <div className="bg-white rounded-lg border border-purple-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-4 w-32"></div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 bg-gray-100 rounded animate-pulse"
                ></div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-100 rounded animate-pulse"
                ></div>
              ))}
            </div>
          </div>

          {/* Time slots skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-4 w-40"></div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state only if we've finished loading and still don't have data
  if (!service || !staff) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Booking Information Missing
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Service or staff information is missing.
        </p>
        <button
          onClick={() => router.push("/booking")}
          className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Booking context */}
      <div className="bg-white rounded-lg border border-purple-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{service.name}</h3>
            <p className="text-sm text-gray-500">with {staff.name}</p>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center text-sm text-purple-600 hover:text-purple-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Change Staff
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="p-1 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth().map((date) => {
              const available = isDateAvailable(date);
              const selected = selectedDate && isSameDay(date, selectedDate);
              const today = isToday(date);
              const isCurrentMonth = isSameMonth(date, currentDate);

              return (
                <button
                  key={date.toString()}
                  onClick={() =>
                    available && isCurrentMonth && handleDateSelect(date)
                  }
                  disabled={!available || !isCurrentMonth}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                    ${
                      !isCurrentMonth
                        ? "text-gray-300 cursor-not-allowed opacity-50"
                        : selected
                        ? "bg-purple-500 text-white shadow-md"
                        : today
                        ? "bg-purple-50 text-purple-600 border border-purple-200"
                        : available
                        ? "hover:bg-purple-50 text-gray-900"
                        : "text-gray-300 cursor-not-allowed"
                    }
                  `}
                  style={{ minHeight: "44px" }} // Ensure touch target
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate
                  ? format(selectedDate, "EEEE, MMMM d")
                  : "Select a date"}
              </h3>
            </div>
            {selectedDate && (
              <button
                onClick={fetchAvailableSlots}
                disabled={loadingSlots}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh available times"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingSlots ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            )}
          </div>

          {!selectedDate ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-gray-500 text-sm">
                Please select a date to see available times
              </p>
            </div>
          ) : loadingSlots ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">
                No available times for this date
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Please try another date
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map((slot) => {
                const isProcessing = processingTimeSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => handleTimeSelect(slot)}
                    disabled={!slot.available || processingTimeSlot !== null}
                    className={`
                       px-4 py-3 rounded-lg text-sm font-medium transition-all relative
                       ${
                         slot.available && !processingTimeSlot
                           ? selectedTime === slot.time
                             ? "bg-purple-500 text-white shadow-md"
                             : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                           : isProcessing
                           ? "bg-purple-400 text-white cursor-wait"
                           : "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200"
                       }
                     `}
                    style={{ minHeight: "44px" }} // Ensure touch target
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        Booking...
                      </span>
                    ) : (
                      formatTime(slot.time)
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-6 bg-rose-50 border border-rose-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-rose-700">Error</h3>
              <div className="mt-2 text-sm text-rose-600">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-sm bg-rose-100 text-rose-700 rounded-md px-3 py-2 hover:bg-rose-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          All times are shown in Pacific Time (PT). Select a time to continue to
          booking confirmation.
        </p>
        {/* Auto-selected date notice */}
        {dateAutoSelected && (
          <div className="flex justify-center bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Previously selected date restored:{" "}
                  <strong>
                    {selectedDate && format(selectedDate, "EEEE, MMMM d")}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
