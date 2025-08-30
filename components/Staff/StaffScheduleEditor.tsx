"use client";

import { useState, useEffect } from "react";
import { DayOfWeek } from "@prisma/client";

interface ScheduleSlot {
  id?: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
}

interface UpcomingBooking {
  id: string;
  datetime: string;
  service: string;
  duration: number;
  customer: string;
}

interface StaffSchedule {
  weeklySchedule: Record<DayOfWeek, ScheduleSlot[]>;
  overrides: Array<{
    id?: string;
    date: string;
    start_time?: string;
    end_time?: string;
    type: "special_hours" | "time_off";
  }>;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export default function StaffScheduleEditor() {
  const [schedule, setSchedule] = useState<StaffSchedule | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [workingSchedule, setWorkingSchedule] = useState<
    Record<
      DayOfWeek,
      {
        is_available: boolean;
        start_time: string;
        end_time: string;
      }
    >
  >({
    MONDAY: { is_available: false, start_time: "09:00", end_time: "17:00" },
    TUESDAY: { is_available: false, start_time: "09:00", end_time: "17:00" },
    WEDNESDAY: { is_available: false, start_time: "09:00", end_time: "17:00" },
    THURSDAY: { is_available: false, start_time: "09:00", end_time: "17:00" },
    FRIDAY: { is_available: false, start_time: "09:00", end_time: "17:00" },
    SATURDAY: { is_available: false, start_time: "09:00", end_time: "17:00" },
    SUNDAY: { is_available: false, start_time: "09:00", end_time: "17:00" },
  });
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });

  // Load staff schedule and bookings
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const response = await fetch("/api/staff/availability");

        if (!response.ok) {
          throw new Error("Failed to fetch schedule");
        }

        const data = await response.json();

        if (data.success) {
          setSchedule(data.availability);
          setUpcomingBookings(data.upcomingBookings || []);

          // Convert API data to working schedule format
          const newWorkingSchedule = { ...workingSchedule };

          DAYS_OF_WEEK.forEach((day) => {
            const daySchedules = data.availability.weeklySchedule[day] || [];
            if (daySchedules.length > 0) {
              const mainSchedule = daySchedules[0];
              newWorkingSchedule[day] = {
                is_available: true,
                start_time: mainSchedule.start_time,
                end_time: mainSchedule.end_time,
              };
            }
          });

          setWorkingSchedule(newWorkingSchedule);
        }
      } catch (error) {
        console.error("Error loading schedule:", error);
        alert("Failed to load schedule. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDayToggle = (day: DayOfWeek, enabled: boolean) => {
    setWorkingSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_available: enabled,
      },
    }));
  };

  const handleTimeChange = (
    day: DayOfWeek,
    field: "start_time" | "end_time",
    value: string
  ) => {
    setWorkingSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      const schedules = DAYS_OF_WEEK.map((day) => ({
        day_of_week: day,
        start_time: workingSchedule[day].start_time,
        end_time: workingSchedule[day].end_time,
        is_available: workingSchedule[day].is_available,
      }));

      const response = await fetch("/api/staff/availability", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert(
            `Cannot update schedule:\n\n${data.conflicts.join("\n")}\n\n${
              data.message
            }`
          );
          return;
        }
        throw new Error(data.error || "Failed to update schedule");
      }

      if (data.success) {
        alert("Schedule updated successfully!");
      } else {
        throw new Error(data.error || "Failed to update schedule");
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert(
        `Failed to save schedule: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeOffRequest = async () => {
    if (!timeOffForm.start_date || !timeOffForm.end_date) {
      alert("Please select start and end dates for your time off request.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/staff/availability", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeOffRequest: {
            start_date: new Date(timeOffForm.start_date).toISOString(),
            end_date: new Date(timeOffForm.end_date).toISOString(),
            reason: timeOffForm.reason,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert(
            `Cannot request time off:\n\n${data.conflicts.join("\n")}\n\n${
              data.message
            }`
          );
          return;
        }
        throw new Error(data.error || "Failed to submit time off request");
      }

      if (data.success) {
        alert("Time off request submitted successfully!");
        setShowTimeOffForm(false);
        setTimeOffForm({ start_date: "", end_date: "", reason: "" });
        // Reload data to show the new override
        window.location.reload();
      } else {
        throw new Error(data.error || "Failed to submit time off request");
      }
    } catch (error) {
      console.error("Error submitting time off request:", error);
      alert(
        `Failed to submit time off request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Manage Your Schedule
        </h2>
        <p className="text-gray-600">
          Update your availability and request time off. Changes may affect
          existing bookings.
        </p>
      </div>

      {/* Upcoming Bookings Alert */}
      {upcomingBookings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">
            Upcoming Bookings ({upcomingBookings.length})
          </h3>
          <div className="text-sm text-blue-800">
            {upcomingBookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="mb-1">
                {new Date(booking.datetime).toLocaleDateString()} at{" "}
                {new Date(booking.datetime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                - {booking.service}
              </div>
            ))}
            {upcomingBookings.length > 3 && (
              <div className="text-blue-600">
                + {upcomingBookings.length - 3} more bookings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Weekly Availability
          </h3>
          {/* <button
            onClick={() => setShowTimeOffForm(!showTimeOffForm)}
            className="px-4 py-2 text-sm border border-purple-300 text-purple-600 rounded-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Request Time Off
          </button> */}
        </div>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className={`border rounded-lg p-4 transition-colors ${
                workingSchedule[day].is_available
                  ? "border-purple-200 bg-purple-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={workingSchedule[day].is_available}
                      onChange={(e) => handleDayToggle(day, e.target.checked)}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="ml-2 font-medium text-gray-900 min-w-[100px]">
                      {DAY_LABELS[day]}
                    </span>
                  </label>

                  {workingSchedule[day].is_available && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={workingSchedule[day].start_time}
                        onChange={(e) =>
                          handleTimeChange(day, "start_time", e.target.value)
                        }
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500">to</span>
                      <select
                        value={workingSchedule[day].end_time}
                        onChange={(e) =>
                          handleTimeChange(day, "end_time", e.target.value)
                        }
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {!workingSchedule[day].is_available && (
                  <span className="text-sm text-gray-500">Not available</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveSchedule}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </div>

      {/* Time Off Request Form */}
      {/* {showTimeOffForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Request Time Off
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={timeOffForm.start_date}
                onChange={(e) =>
                  setTimeOffForm((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={timeOffForm.end_date}
                onChange={(e) =>
                  setTimeOffForm((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
                min={
                  timeOffForm.start_date ||
                  new Date().toISOString().split("T")[0]
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (Optional)
            </label>
            <textarea
              value={timeOffForm.reason}
              onChange={(e) =>
                setTimeOffForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Vacation, personal day, etc."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowTimeOffForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              onClick={handleTimeOffRequest}
              disabled={
                isSaving || !timeOffForm.start_date || !timeOffForm.end_date
              }
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
}
