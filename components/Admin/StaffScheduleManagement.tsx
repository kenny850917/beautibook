"use client";

import { useState, useEffect } from "react";
import { DayOfWeek } from "@prisma/client";

interface StaffMember {
  id: string;
  name: string;
}

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

interface ScheduleOverride {
  id?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  type: "special_hours" | "time_off";
}

interface StaffSchedule {
  weeklySchedule: Record<DayOfWeek, ScheduleSlot[]>;
  overrides: ScheduleOverride[];
}

interface StaffScheduleManagementProps {
  staffId: string;
  staffName: string;
  onClose?: () => void;
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

export default function StaffScheduleManagement({
  staffId,
  staffName,
  onClose,
}: StaffScheduleManagementProps) {
  const [schedule, setSchedule] = useState<StaffSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState<Record<DayOfWeek, boolean>>({
    MONDAY: false,
    TUESDAY: false,
    WEDNESDAY: false,
    THURSDAY: false,
    FRIDAY: false,
    SATURDAY: false,
    SUNDAY: false,
  });
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

  const [showBlockForm, setShowBlockForm] = useState<{
    day: DayOfWeek | null;
    blockId?: string;
  }>({ day: null });
  const [newBlock, setNewBlock] = useState<{
    block_start_time: string;
    block_end_time: string;
    block_type: "lunch" | "break" | "appointment" | "personal";
    title: string;
    is_recurring: boolean;
  }>({
    block_start_time: "12:00",
    block_end_time: "13:00",
    block_type: "lunch",
    title: "Lunch Break",
    is_recurring: true,
  });

  // Load staff schedule
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/admin/staff/${staffId}/availability`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch schedule");
        }

        const data = await response.json();

        if (data.success) {
          setSchedule(data.availability);

          // Convert API data to working schedule format with blocks
          const newWorkingSchedule = { ...workingSchedule };

          DAYS_OF_WEEK.forEach((day) => {
            const daySchedules = data.availability.weeklySchedule[day] || [];
            if (daySchedules.length > 0) {
              const mainSchedule = daySchedules[0]; // Take first schedule for the day
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

    loadSchedule();
  }, [staffId]);

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

  const handleAddBlock = (day: DayOfWeek) => {
    setShowBlockForm({ day });
    setNewBlock({
      block_start_time: "12:00",
      block_end_time: "13:00",
      block_type: "lunch",
      title: "Lunch Break",
      is_recurring: true,
    });
  };

  const handleEditBlock = (day: DayOfWeek, blockId: string) => {
    const block = workingSchedule[day].blocks.find((b) => b.id === blockId);
    if (block) {
      setShowBlockForm({ day, blockId });
      setNewBlock({
        block_start_time: block.block_start_time,
        block_end_time: block.block_end_time,
        block_type: block.block_type,
        title: block.title,
        is_recurring: block.is_recurring,
      });
    }
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
      // Convert working schedule to API format with blocks
      const schedules = DAYS_OF_WEEK.map((day) => ({
        day_of_week: day,
        start_time: workingSchedule[day].start_time,
        end_time: workingSchedule[day].end_time,
        is_available: workingSchedule[day].is_available,
        blocks: workingSchedule[day].blocks.map((block) => ({
          id: block.id?.startsWith("temp-") ? undefined : block.id, // Don't send temp IDs
          block_start_time: block.block_start_time,
          block_end_time: block.block_end_time,
          block_type: block.block_type,
          title: block.title,
          is_recurring: block.is_recurring,
        })),
      }));

      const response = await fetch(`/api/admin/staff/${staffId}/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update schedule");
      }

      const data = await response.json();

      if (data.success) {
        alert("Schedule updated successfully!");

        // Show conflict warnings if any
        if (data.conflictWarnings && data.conflictWarnings.length > 0) {
          alert(
            `Schedule saved with warnings:\n\n${data.conflictWarnings.join(
              "\n"
            )}`
          );
        }

        // Reload schedule to reflect changes
        window.location.reload();
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
            <p className="text-gray-600">Loading schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Schedule: {staffName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Set weekly availability and manage time off
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
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
          )}
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Weekly Schedule
        </h3>

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
                    <div className="space-y-3">
                      {/* Working Hours */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 w-20">
                          Hours:
                        </span>
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

                      {/* Schedule Blocks */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Blocks:</span>
                          <button
                            onClick={() => handleAddBlock(day)}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            + Add Block
                          </button>
                        </div>

                        {workingSchedule[day].blocks.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {workingSchedule[day].blocks.map((block) => (
                              <div
                                key={block.id}
                                className={`inline-flex items-center space-x-2 px-2 py-1 rounded text-xs border ${getBlockTypeColor(
                                  block.block_type
                                )}`}
                              >
                                <span className="font-medium">
                                  {block.title}
                                </span>
                                <span className="text-xs opacity-75">
                                  {block.block_start_time}-
                                  {block.block_end_time}
                                </span>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() =>
                                      handleEditBlock(day, block.id!)
                                    }
                                    className="hover:opacity-70"
                                    title="Edit block"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRemoveBlock(day, block.id!)
                                    }
                                    className="hover:opacity-70"
                                    title="Remove block"
                                  >
                                    ❌
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            No blocks set. Click &quot;Add Block&quot; to add
                            lunch, breaks, etc.
                          </div>
                        )}
                      </div>
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

        {/* Save Button */}
        <div className="mt-8 flex justify-end space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSaveSchedule}
            disabled={isSaving}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </div>

      {/* Block Form Modal */}
      {showBlockForm.day && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {showBlockForm.blockId ? "Edit Block" : "Add Block"} -{" "}
              {DAY_LABELS[showBlockForm.day]}
            </h3>

            <div className="space-y-4">
              {/* Block Type */}
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
                  <option value="lunch">Lunch</option>
                  <option value="break">Break</option>
                  <option value="appointment">Appointment</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              {/* Title */}
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
                  placeholder="e.g., Lunch Break, Team Meeting"
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <select
                    value={newBlock.block_start_time}
                    onChange={(e) =>
                      setNewBlock((prev) => ({
                        ...prev,
                        block_start_time: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <select
                    value={newBlock.block_end_time}
                    onChange={(e) =>
                      setNewBlock((prev) => ({
                        ...prev,
                        block_end_time: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurring */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newBlock.is_recurring}
                    onChange={(e) =>
                      setNewBlock((prev) => ({
                        ...prev,
                        is_recurring: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Recurring (applies every week)
                  </span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBlockForm({ day: null })}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlock}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
