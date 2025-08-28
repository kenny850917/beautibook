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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [processingTimeSlot, setProcessingTimeSlot] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!serviceId || !staffId) {
      router.push("/booking");
      return;
    }
    fetchServiceAndStaff();
  }, [serviceId, staffId]);

  useEffect(() => {
    if (selectedDate && serviceId && staffId) {
      fetchAvailableSlots();
    }
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
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !serviceId || !staffId) return;

    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/availability?date=${dateStr}&service=${serviceId}&staff=${staffId}`
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
  };

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    if (!timeSlot.available || processingTimeSlot) return;

    setSelectedTime(timeSlot.time);
    setProcessingTimeSlot(timeSlot.time);

    // Navigate to confirmation with all booking details
    router.push(
      `/booking/confirm?service=${serviceId}&staff=${staffId}&datetime=${timeSlot.datetime}`
    );
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
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
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

  if (!service || !staff) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-pink-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Booking Information Missing
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Service or staff information is missing.
        </p>
        <button
          onClick={() => router.push("/booking")}
          className="inline-flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
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
      <div className="bg-white rounded-lg border border-pink-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{service.name}</h3>
            <p className="text-sm text-gray-500">with {staff.name}</p>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center text-sm text-pink-600 hover:text-pink-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Change Staff
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="p-1 rounded-lg hover:bg-pink-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-pink-50 transition-colors"
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

              return (
                <button
                  key={date.toString()}
                  onClick={() => available && handleDateSelect(date)}
                  disabled={!available}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                    ${
                      selected
                        ? "bg-pink-500 text-white shadow-md"
                        : today
                        ? "bg-pink-50 text-pink-600 border border-pink-200"
                        : available
                        ? "hover:bg-pink-50 text-gray-900"
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
        <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-pink-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : "Select a date"}
            </h3>
          </div>

          {!selectedDate ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-pink-500" />
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
                             ? "bg-pink-500 text-white shadow-md"
                             : "bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200"
                           : isProcessing
                           ? "bg-pink-400 text-white cursor-wait"
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

      {/* Help text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          All times are shown in Pacific Time (PT). Select a time to continue to
          booking confirmation.
        </p>
      </div>
    </div>
  );
}
