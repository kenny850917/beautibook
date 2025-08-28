"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Calendar,
  momentLocalizer,
  View,
  Views,
  NavigateAction,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { toZonedTime } from "date-fns-tz";

// Setup the localizer for moment
const localizer = momentLocalizer(moment);

// PST timezone
const PST_TIMEZONE = "America/Los_Angeles";

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

interface BaseCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void;
  onNavigate?: (date: Date) => void;
  defaultView?: View;
  views?: View[];
  min?: Date;
  max?: Date;
  step?: number;
  timeslots?: number;
  selectable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base Calendar component for BeautiBook
 * Mobile-optimized React Big Calendar with touch support
 */
export default function BaseCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onNavigate,
  defaultView = Views.DAY,
  views = [Views.DAY, Views.WEEK, Views.MONTH],
  min = new Date(2023, 0, 1, 9, 0), // 9 AM
  max = new Date(2023, 0, 1, 18, 0), // 6 PM
  step = 15, // 15-minute intervals
  timeslots = 4, // 4 slots per hour (15min each)
  selectable = true,
  className = "",
  style = {},
  ...props
}: BaseCalendarProps) {
  const [currentView, setCurrentView] = useState<View>(defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mobile-optimized toolbar
  const CustomToolbar = useCallback(
    ({
      label,
      onNavigate,
      onView,
    }: {
      label: string;
      onNavigate: (action: NavigateAction) => void;
      onView: (view: View) => void;
    }) => {
      return (
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-white border-b border-gray-200">
          {/* Mobile: Stack navigation and view controls */}
          <div className="flex items-center space-x-2 mb-2 sm:mb-0">
            <button
              onClick={() => onNavigate("PREV" as NavigateAction)}
              className="btn-touch bg-gray-100 text-gray-600 hover:bg-gray-200 p-2 rounded-lg"
              aria-label="Previous"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <h2 className="text-lg font-semibold text-gray-900 px-4">
              {label}
            </h2>

            <button
              onClick={() => onNavigate("NEXT" as NavigateAction)}
              className="btn-touch bg-gray-100 text-gray-600 hover:bg-gray-200 p-2 rounded-lg"
              aria-label="Next"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <button
              onClick={() => onNavigate("TODAY" as NavigateAction)}
              className="btn-touch bg-primary-600 text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium ml-2"
            >
              Today
            </button>
          </div>

          {/* View switcher */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {views.map((view) => (
              <button
                key={view}
                onClick={() => onView(view)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === view
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {view === Views.DAY && "Day"}
                {view === Views.WEEK && "Week"}
                {view === Views.MONTH && "Month"}
              </button>
            ))}
          </div>
        </div>
      );
    },
    [currentView, views]
  );

  // Custom event component with mobile-friendly styling
  const CustomEvent = useCallback(({ event }: { event: CalendarEvent }) => {
    const eventType = event.resource?.type || "booking";
    const status = event.resource?.status || "confirmed";

    const getEventStyles = () => {
      switch (eventType) {
        case "booking":
          return status === "confirmed"
            ? "bg-primary-500 text-white border-primary-600"
            : "bg-yellow-500 text-white border-yellow-600";
        case "hold":
          return "bg-orange-400 text-white border-orange-500";
        case "availability":
          return "bg-green-500 text-white border-green-600";
        default:
          return "bg-gray-500 text-white border-gray-600";
      }
    };

    return (
      <div
        className={`px-2 py-1 rounded text-xs font-medium border ${getEventStyles()}`}
        style={{
          height: "100%",
          minHeight: "24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span className="truncate">{event.title}</span>
      </div>
    );
  }, []);

  // Custom time slot component for better mobile touch targets
  const CustomTimeSlot = useCallback(
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => {
      return (
        <div
          {...props}
          className="min-h-[44px] border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          style={{ minHeight: "44px" }}
        >
          {children}
        </div>
      );
    },
    []
  );

  // Handle view changes
  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  // Handle date navigation
  const handleNavigate = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onNavigate?.(date);
    },
    [onNavigate]
  );

  // Format events for React Big Calendar
  const formattedEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: toZonedTime(event.start, PST_TIMEZONE),
      end: toZonedTime(event.end, PST_TIMEZONE),
    }));
  }, [events]);

  // Mobile-specific calendar props
  const mobileCalendarProps = {
    popup: true,
    popupOffset: 30,
    showMultiDayTimes: true,
    rtl: false,

    // Touch-friendly event handling
    onDoubleClickEvent: undefined, // Disable double-click on mobile
    onKeyPressEvent: undefined, // Disable keyboard events on mobile

    // Mobile-optimized dimensions
    dayLayoutAlgorithm: "no-overlap" as const,
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-soft ${className}`}
      style={style}
    >
      <style jsx global>{`
        /* Mobile-optimized calendar styles */
        .rbc-calendar {
          font-size: 14px;
        }

        .rbc-time-view .rbc-time-gutter,
        .rbc-time-view .rbc-time-content {
          min-height: 44px;
        }

        .rbc-time-slot {
          min-height: 44px !important;
          border-bottom: 1px solid #f3f4f6;
        }

        .rbc-event {
          border-radius: 6px;
          border: none;
          font-weight: 500;
          font-size: 12px;
          min-height: 24px;
        }

        .rbc-event:focus {
          outline: 2px solid #a855f7;
          outline-offset: 2px;
        }

        .rbc-time-header {
          border-bottom: 2px solid #e5e7eb;
        }

        .rbc-header {
          font-weight: 600;
          color: #374151;
          padding: 8px;
        }

        .rbc-today {
          background-color: #faf5ff;
        }

        .rbc-off-range-bg {
          background-color: #f9fafb;
        }

        /* Touch-friendly month view */
        .rbc-month-view .rbc-date-cell {
          min-height: 44px;
          padding: 4px;
        }

        .rbc-month-view .rbc-event {
          margin: 1px;
          padding: 2px 4px;
        }

        /* Week view optimizations */
        .rbc-time-view .rbc-time-gutter .rbc-timeslot-group {
          border-bottom: 1px solid #e5e7eb;
        }

        /* Day view optimizations */
        .rbc-day-slot .rbc-time-slot {
          cursor: pointer;
        }

        .rbc-day-slot .rbc-time-slot:hover {
          background-color: #f3f4f6;
        }

        /* Custom scrollbar for mobile */
        .rbc-time-content::-webkit-scrollbar {
          width: 8px;
        }

        .rbc-time-content::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .rbc-time-content::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .rbc-time-content::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @media (max-width: 640px) {
          .rbc-calendar {
            font-size: 12px;
          }

          .rbc-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .rbc-toolbar-label {
            text-align: center;
            margin: 8px 0;
          }

          .rbc-time-header .rbc-header {
            font-size: 11px;
            padding: 4px 2px;
          }
        }
      `}</style>

      <Calendar
        localizer={localizer}
        events={formattedEvents}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        view={currentView}
        views={views}
        date={currentDate}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable={selectable}
        min={min}
        max={max}
        step={step}
        timeslots={timeslots}
        components={{
          toolbar: CustomToolbar,
          event: CustomEvent,
          timeSlotWrapper: CustomTimeSlot,
        }}
        {...mobileCalendarProps}
        {...props}
      />
    </div>
  );
}
