import {
  format,
  parse,
  parseISO,
  addMinutes,
  isWithinInterval,
  isSameDay,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Calendar utilities for BeautiBook booking system
 * Handles PST timezone conversion and 15-minute slot generation
 */

// PST timezone identifier
export const PST_TIMEZONE = "America/Los_Angeles";

// Business hours for BeautiBook (9 AM to 6 PM PST)
export const BUSINESS_HOURS = {
  start: "09:00",
  end: "18:00",
} as const;

// Operating days (Tuesday through Saturday)
export const OPERATING_DAYS = [2, 3, 4, 5, 6] as const; // 2=Tuesday, 6=Saturday

/**
 * Convert PST time string to UTC Date object
 */
export function pstToUtc(dateStr: string, timeStr: string): Date {
  const pstDateTime = parse(
    `${dateStr} ${timeStr}`,
    "yyyy-MM-dd HH:mm",
    new Date()
  );
  return fromZonedTime(pstDateTime, PST_TIMEZONE);
}

/**
 * Convert UTC Date to PST display format
 */
export function utcToPstDisplay(utcDate: Date): {
  date: string;
  time: string;
  dateTime: string;
} {
  const pstDate = toZonedTime(utcDate, PST_TIMEZONE);

  return {
    date: format(pstDate, "yyyy-MM-dd"),
    time: format(pstDate, "HH:mm"),
    dateTime: format(pstDate, "yyyy-MM-dd HH:mm"),
  };
}

/**
 * Convert UTC ISO string to PST Date for display
 */
export function utcIsoToPst(isoString: string): Date {
  const utcDate = parseISO(isoString);
  return toZonedTime(utcDate, PST_TIMEZONE);
}

/**
 * Generate 15-minute time slots for a given date
 */
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const startTime = parse(BUSINESS_HOURS.start, "HH:mm", new Date());
  const endTime = parse(BUSINESS_HOURS.end, "HH:mm", new Date());

  let currentTime = startTime;

  while (currentTime < endTime) {
    slots.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, 15);
  }

  return slots;
}

/**
 * Check if a date is an operating day (Tuesday-Saturday)
 */
export function isOperatingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return OPERATING_DAYS.includes(dayOfWeek as (typeof OPERATING_DAYS)[number]);
}

/**
 * Check if a time slot is within business hours
 */
export function isWithinBusinessHours(timeStr: string): boolean {
  const time = parse(timeStr, "HH:mm", new Date());
  const start = parse(BUSINESS_HOURS.start, "HH:mm", new Date());
  const end = parse(BUSINESS_HOURS.end, "HH:mm", new Date());

  return isWithinInterval(time, { start, end });
}

/**
 * Format duration in minutes to display format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Format price in cents to display format
 */
export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

/**
 * Check if two dates are the same day in PST
 */
export function isSamePstDay(date1: Date, date2: Date): boolean {
  const pstDate1 = toZonedTime(date1, PST_TIMEZONE);
  const pstDate2 = toZonedTime(date2, PST_TIMEZONE);
  return isSameDay(pstDate1, pstDate2);
}

/**
 * Get PST date string for today
 */
export function getTodayPst(): string {
  const now = new Date();
  const pstNow = toZonedTime(now, PST_TIMEZONE);
  return format(pstNow, "yyyy-MM-dd");
}

/**
 * Calculate end time for a service booking
 */
export function calculateEndTime(
  startTime: Date,
  durationMinutes: number
): Date {
  return addMinutes(startTime, durationMinutes);
}

/**
 * Check if a booking time conflicts with existing bookings
 */
export function hasTimeConflict(
  newStart: Date,
  newDuration: number,
  existingBookings: Array<{ slot_datetime: Date; duration_minutes: number }>
): boolean {
  const newEnd = calculateEndTime(newStart, newDuration);

  return existingBookings.some((booking) => {
    const existingEnd = calculateEndTime(
      new Date(booking.slot_datetime),
      booking.duration_minutes
    );

    // Check for overlap
    return (
      (newStart >= new Date(booking.slot_datetime) && newStart < existingEnd) ||
      (newEnd > new Date(booking.slot_datetime) && newEnd <= existingEnd) ||
      (newStart <= new Date(booking.slot_datetime) && newEnd >= existingEnd)
    );
  });
}

/**
 * Get display name for day of week
 */
export function getDayName(dayIndex: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayIndex] || "Unknown";
}

/**
 * Get PST date for React Big Calendar
 */
export function getPstDateForCalendar(date: Date): Date {
  return toZonedTime(date, PST_TIMEZONE);
}
