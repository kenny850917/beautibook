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

  // Google Calendar-style event prop getter
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const eventType = event.resource?.type || "booking";
    const status = event.resource?.status || "confirmed";

    let className = "";
    const style: React.CSSProperties = {};

    // Determine event styling based on type and status
    switch (eventType) {
      case "booking":
        if (status === "confirmed") {
          className = "event-primary";
        } else if (status === "pending") {
          className = "event-warning";
        } else if (status === "cancelled") {
          className = "event-danger";
        }
        break;
      case "hold":
        className = "event-warning";
        break;
      case "availability":
        className = "event-secondary";
        break;
      default:
        className = "event-info";
    }

    return {
      className,
      style,
    };
  }, []);

  // Custom event component with Google Calendar styling
  const CustomEvent = useCallback(({ event }: { event: CalendarEvent }) => {
    const eventType = event.resource?.type || "booking";

    // Format time for display
    const startTime = moment(event.start).format("h:mm A");
    const endTime = moment(event.end).format("h:mm A");
    const duration = moment(event.end).diff(moment(event.start), "minutes");

    return (
      <div
        className="h-full flex flex-col justify-center"
        style={{
          minHeight: "24px",
          padding: "2px 0",
        }}
      >
        <div className="rbc-event-label font-medium">{event.title}</div>
        {duration >= 60 && (
          <div
            className="text-xs opacity-90 mt-1"
            style={{
              fontSize: "11px",
              lineHeight: "1.2",
            }}
          >
            {startTime} - {endTime}
          </div>
        )}
        {eventType === "booking" && event.resource?.customerId && (
          <div
            className="text-xs opacity-80 mt-1"
            style={{
              fontSize: "10px",
              lineHeight: "1.2",
            }}
          >
            Customer: {event.resource.customerId}
          </div>
        )}
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
        /* === MODERN CALENDAR DESIGN - GOOGLE CALENDAR INSPIRED === */

        /* Base Calendar Styles */
        .rbc-calendar {
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          background: #ffffff;
          border: 1px solid #e8eaed;
          border-radius: 8px;
          overflow: hidden;
        }

        /* === FIX: ALL-DAY EVENTS ROW ALIGNMENT === */
        /* Hide all-day events row if not needed - removes grey line issue */
        .rbc-allday-cell {
          display: none;
        }

        /* If you want to keep all-day events, use this instead: */
        /*
        .rbc-allday-cell {
          min-height: 32px;
          border-bottom: 1px solid #e8eaed;
          background: #f8f9fa;
        }

        .rbc-row.rbc-time-header-cell {
          display: flex;
          flex: 1;
          min-width: 0;
        }

        .rbc-allday-cell .rbc-row-bg,
        .rbc-time-header-cell .rbc-row-bg {
          width: 100%;
          display: flex;
        }

        .rbc-allday-cell .rbc-row-bg .rbc-day-bg,
        .rbc-time-header-cell .rbc-header {
          flex: 1 0 0%;
          min-width: 0;
        }
        */

        /* === HEADER IMPROVEMENTS === */
        .rbc-time-header {
          border-bottom: 1px solid #e8eaed;
          background: #ffffff;
        }

        .rbc-header {
          font-weight: 500;
          color: #3c4043;
          padding: 12px 8px;
          font-size: 13px;
          border-right: 1px solid #e8eaed;
        }

        .rbc-header:last-child {
          border-right: none;
        }

        /* === TIME SLOTS OPTIMIZATION === */
        .rbc-time-view .rbc-time-gutter,
        .rbc-time-view .rbc-time-content {
          min-height: 48px;
        }

        .rbc-time-slot {
          min-height: 48px !important;
          border-bottom: 1px solid #f1f3f4;
          transition: background-color 0.15s ease;
        }

        .rbc-timeslot-group {
          border-bottom: 1px solid #e8eaed;
        }

        .rbc-time-gutter .rbc-timeslot-group {
          border-bottom: none;
        }

        /* === EVENT STYLING - AUTHENTIC GOOGLE CALENDAR LOOK === */
        .rbc-event {
          border-radius: 8px;
          border: none;
          font-weight: 500;
          font-size: 13px;
          min-height: 24px;
          padding: 4px 8px;
          box-shadow: 0 1px 3px 0 rgba(60, 64, 67, 0.302),
            0 4px 8px 3px rgba(60, 64, 67, 0.149);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #1f1f1f;
          line-height: 1.4;
          overflow: hidden;
          position: relative;
        }

        .rbc-event:hover {
          box-shadow: 0 2px 6px 2px rgba(60, 64, 67, 0.15),
            0 8px 24px 4px rgba(60, 64, 67, 0.15);
          transform: translateY(-1px);
        }

        .rbc-event:focus {
          outline: 2px solid #1a73e8;
          outline-offset: 2px;
        }

        .rbc-selected {
          box-shadow: 0 2px 6px 2px rgba(26, 115, 232, 0.15),
            0 8px 24px 4px rgba(26, 115, 232, 0.15);
        }

        /* Google Calendar-style event text */
        .rbc-event-label {
          font-weight: 500;
          font-size: 13px;
          color: inherit;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Different event types with Google Calendar colors */
        .rbc-event.event-primary {
          background-color: #1a73e8;
          color: white;
        }

        .rbc-event.event-secondary {
          background-color: #34a853;
          color: white;
        }

        .rbc-event.event-warning {
          background-color: #fbbc04;
          color: #1f1f1f;
        }

        .rbc-event.event-danger {
          background-color: #ea4335;
          color: white;
        }

        .rbc-event.event-info {
          background-color: #4285f4;
          color: white;
        }

        .rbc-event.event-success {
          background-color: #0d7377;
          color: white;
        }

        /* Subtle gradient overlay for depth */
        .rbc-event::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0) 50%
          );
          border-radius: 8px;
          pointer-events: none;
        }

        /* === TODAY HIGHLIGHTING === */
        .rbc-today {
          background-color: #e8f0fe;
        }

        .rbc-off-range-bg {
          background-color: #f8f9fa;
        }

        /* === TOUCH-FRIENDLY INTERACTIONS === */
        .rbc-day-slot .rbc-time-slot {
          cursor: pointer;
          min-height: 48px;
        }

        .rbc-day-slot .rbc-time-slot:hover {
          background-color: #f8f9fa;
        }

        .rbc-selectable .rbc-time-slot {
          cursor: crosshair;
        }

        /* === MONTH VIEW OPTIMIZATIONS === */
        .rbc-month-view .rbc-date-cell {
          min-height: 48px;
          padding: 4px;
          border-right: 1px solid #e8eaed;
        }

        .rbc-month-view .rbc-date-cell:last-child {
          border-right: none;
        }

        .rbc-month-view .rbc-event {
          margin: 1px;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
        }

        .rbc-month-view .rbc-row {
          border-bottom: 1px solid #e8eaed;
        }

        .rbc-month-view .rbc-row:last-child {
          border-bottom: none;
        }

        /* === WEEK VIEW OPTIMIZATIONS === */
        .rbc-time-view .rbc-time-gutter {
          background: #ffffff;
          border-right: 1px solid #e8eaed;
        }

        .rbc-time-view .rbc-time-content {
          border-left: none;
        }

        .rbc-time-view .rbc-day-slot {
          border-right: 1px solid #e8eaed;
        }

        .rbc-time-view .rbc-day-slot:last-child {
          border-right: none;
        }

        /* === CUSTOM SCROLLBAR === */
        .rbc-time-content::-webkit-scrollbar {
          width: 12px;
        }

        .rbc-time-content::-webkit-scrollbar-track {
          background: #f8f9fa;
          border-radius: 6px;
        }

        .rbc-time-content::-webkit-scrollbar-thumb {
          background: #dadce0;
          border-radius: 6px;
          border: 2px solid #f8f9fa;
        }

        .rbc-time-content::-webkit-scrollbar-thumb:hover {
          background: #bdc1c6;
        }

        /* === MOBILE RESPONSIVENESS === */
        @media (max-width: 640px) {
          .rbc-calendar {
            font-size: 12px;
            border-radius: 0;
            border: none;
          }

          .rbc-toolbar {
            flex-direction: column;
            align-items: stretch;
            padding: 8px;
          }

          .rbc-toolbar-label {
            text-align: center;
            margin: 8px 0;
            font-size: 16px;
            font-weight: 500;
          }

          .rbc-time-header .rbc-header {
            font-size: 11px;
            padding: 8px 4px;
          }

          .rbc-time-slot {
            min-height: 44px !important;
          }

          .rbc-event {
            font-size: 11px;
            padding: 1px 4px;
          }

          .rbc-day-slot .rbc-time-slot {
            min-height: 44px;
          }
        }

        /* === LOADING STATES === */
        .rbc-calendar.loading {
          opacity: 0.7;
          pointer-events: none;
        }

        .rbc-calendar.loading::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 24px;
          height: 24px;
          margin: -12px 0 0 -12px;
          border: 2px solid #e8eaed;
          border-top: 2px solid #1a73e8;
          border-radius: 50%;
          animation: calendar-spin 1s linear infinite;
        }

        @keyframes calendar-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* === ACCESSIBILITY IMPROVEMENTS === */
        .rbc-event:focus-visible {
          outline: 2px solid #1a73e8;
          outline-offset: 2px;
        }

        .rbc-time-slot:focus-visible {
          outline: 2px solid #1a73e8;
          outline-offset: -2px;
          background-color: #e8f0fe;
        }

        /* === HIGH CONTRAST MODE SUPPORT === */
        @media (prefers-contrast: high) {
          .rbc-calendar {
            border-color: #000000;
          }

          .rbc-event {
            border: 1px solid #000000;
          }

          .rbc-time-slot {
            border-color: #000000;
          }
        }

        /* === REDUCED MOTION SUPPORT === */
        @media (prefers-reduced-motion: reduce) {
          .rbc-event {
            transition: none;
          }

          .rbc-event:hover {
            transform: none;
          }

          .calendar-spin {
            animation: none;
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
        eventPropGetter={eventPropGetter}
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
