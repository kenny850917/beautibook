"use client";

import { useState, useEffect } from "react";
import { DayOfWeek } from "@prisma/client";
import { parseIsoToPstComponents, getTodayPst } from "@/lib/utils/calendar";

interface ScheduleBlock {
  id?: string;
  block_start_time: string;
  block_end_time: string;
  block_type: "lunch" | "break" | "appointment" | "personal";
  title: string;
  is_recurring: boolean;
}

interface ScheduleSlot {
  id?: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  blocks?: ScheduleBlock[];
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
        blocks: ScheduleBlock[];
      }
    >
  >({
    MONDAY: {
      is_available: false,
      start_time: "09:00",
      end_time: "17:00",
      blocks: [],
    },
    TUESDAY: {
      is_available: false,
      start_time: "09:00",
      end_time: "17:00",
      blocks: [],
    },
    WEDNESDAY: {
      is_available: false,
      start_time: "09:00",
      end_time: "17:00",
      blocks: [],
    },
    THURSDAY: {
      is_available: false,
      start_time: "09:00",
      end_time: "17:00",
      blocks: [],
    },
    FRIDAY: {
      is_available: false,
      start_time: "09:00",
      end_time: "17:00",
      blocks: [],
    },
    SATURDAY: {
      is_available: false,
      start_time: "09:00",
      end_time: "17:00",
      blocks: [],
    },
    SUNDAY: {
      is_available: false,
      start_time: "09:00",
      end_time: "17:00",
      blocks: [],
    },
  });
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });

  // Block management state
  const [showBlockForm, setShowBlockForm] = useState<{
    day: DayOfWeek | null;
    blockId?: string;
  }>({ day: null });

  const [newBlock, setNewBlock] = useState<ScheduleBlock>({
    block_start_time: "12:00",
    block_end_time: "13:00",
    block_type: "lunch",
    title: "Lunch Break",
    is_recurring: false,
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
                blocks: mainSchedule.blocks || [],
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

  // Block management functions
  const handleAddBlock = (day: DayOfWeek) => {
    setNewBlock({
      block_start_time: "12:00",
      block_end_time: "13:00",
      block_type: "lunch",
      title: "Lunch Break",
      is_recurring: false,
    });
    setShowBlockForm({ day });
  };

  const handleEditBlock = (day: DayOfWeek, block: ScheduleBlock) => {
    setNewBlock({ ...block });
    setShowBlockForm({ day, blockId: block.id });
  };

  const handleSaveBlock = () => {
    const { day } = showBlockForm;
    if (!day) return;

    // Validate block times
    if (newBlock.block_start_time >= newBlock.block_end_time) {
      alert("Block end time must be after start time");
      return;
    }

    const workingHours = workingSchedule[day];
    if (
      newBlock.block_start_time < workingHours.start_time ||
      newBlock.block_end_time > workingHours.end_time
    ) {
      alert(
        `Block must be within working hours (${workingHours.start_time} - ${workingHours.end_time})`
      );
      return;
    }

    setWorkingSchedule((prev) => {
      const newSchedule = { ...prev };
      const daySchedule = { ...newSchedule[day] };

      if (showBlockForm.blockId) {
        // Edit existing block
        daySchedule.blocks = daySchedule.blocks.map((block) =>
          block.id === showBlockForm.blockId ? { ...block, ...newBlock } : block
        );
      } else {
        // Add new block
        daySchedule.blocks = [
          ...daySchedule.blocks,
          { ...newBlock, id: `temp-${Date.now()}` },
        ];
      }

      newSchedule[day] = daySchedule;
      return newSchedule;
    });

    setShowBlockForm({ day: null });
  };

  const handleRemoveBlock = (day: DayOfWeek, blockId: string) => {
    setWorkingSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: prev[day].blocks.filter((block) => block.id !== blockId),
      },
    }));
  };

  const getBlockTypeColor = (type: string) => {
    switch (type) {
      case "lunch":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "break":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "appointment":
        return "bg-green-100 text-green-700 border-green-200";
      case "personal":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      const schedules = DAYS_OF_WEEK.map((day) => ({
        day_of_week: day,
        start_time: workingSchedule[day].start_time,
        end_time: workingSchedule[day].end_time,
        is_available: workingSchedule[day].is_available,
        blocks: workingSchedule[day].blocks,
      })).filter((schedule) => schedule.is_available);

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
                {(() => {
                  const components = parseIsoToPstComponents(booking.datetime);
                  return `${components.date} at ${components.display}`;
                })()}{" "}
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

              {/* Schedule Blocks Section */}
              {workingSchedule[day].is_available && (
                <div className="mt-4 pl-4 border-l-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Schedule Blocks
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleAddBlock(day)}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                    >
                      + Add Block
                    </button>
                  </div>

                  <div className="space-y-2">
                    {workingSchedule[day].blocks.map((block, blockIndex) => (
                      <div
                        key={blockIndex}
                        className={`p-2 rounded border text-xs ${getBlockTypeColor(
                          block.block_type
                        )}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{block.title}</span>
                            <span className="ml-2 text-gray-500">
                              {block.block_start_time} - {block.block_end_time}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditBlock(day, block)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() =>
                                handleRemoveBlock(day, block.id || "")
                              }
                              className="text-gray-500 hover:text-red-700"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {workingSchedule[day].blocks.length === 0 && (
                      <p className="text-xs text-gray-500 italic">
                        No schedule blocks. Click &quot;Add Block&quot; to add
                        lunch breaks, personal time, etc.
                      </p>
                    )}
                  </div>
                </div>
              )}
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
                min={getTodayPst()}
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
                min={timeOffForm.start_date || getTodayPst()}
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

      {/* Block Form Modal */}
      {showBlockForm.day && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {showBlockForm.blockId ? "Edit" : "Add"} Schedule Block for{" "}
              {DAY_LABELS[showBlockForm.day]}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Block Type
                </label>
                <select
                  value={newBlock.block_type}
                  onChange={(e) =>
                    setNewBlock((prev) => ({
                      ...prev,
                      block_type: e.target.value as
                        | "lunch"
                        | "break"
                        | "appointment"
                        | "personal",
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="lunch">Lunch Break</option>
                  <option value="break">Coffee Break</option>
                  <option value="personal">Personal Time</option>
                  <option value="appointment">Blocked Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newBlock.title}
                  onChange={(e) =>
                    setNewBlock((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Lunch Break"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newBlock.block_start_time}
                    onChange={(e) =>
                      setNewBlock((prev) => ({
                        ...prev,
                        block_start_time: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newBlock.block_end_time}
                    onChange={(e) =>
                      setNewBlock((prev) => ({
                        ...prev,
                        block_end_time: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={newBlock.is_recurring}
                  onChange={(e) =>
                    setNewBlock((prev) => ({
                      ...prev,
                      is_recurring: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="recurring"
                  className="ml-2 text-sm text-gray-700"
                >
                  Recurring (applies to all weeks)
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowBlockForm({ day: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBlock}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                {showBlockForm.blockId ? "Update" : "Add"} Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
