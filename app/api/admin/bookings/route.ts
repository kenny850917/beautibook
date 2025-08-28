/**
 * Admin Bookings API
 * Endpoint for fetching all bookings for admin dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns";

// Validation schema for booking queries
const BookingQuerySchema = z.object({
  date: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  staffId: z.string().nullish(),
  status: z
    .enum(["all", "today", "week", "upcoming"])
    .nullish()
    .transform((val) => val ?? "all"),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .nullish()
    .transform((val) => val ?? 50),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");

    // Validate input
    const validationResult = BookingQuerySchema.safeParse({
      date,
      startDate,
      endDate,
      staffId,
      status,
      limit,
    });

    if (!validationResult.success) {
      console.error(
        "Admin bookings API validation error:",
        validationResult.error.issues
      );
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      date: validDate,
      startDate: validStartDate,
      endDate: validEndDate,
      staffId: validStaffId,
      status: validStatus,
      limit: validLimit,
    } = validationResult.data;

    const prisma = PrismaService.getInstance();

    // Build date filter
    let dateFilter = {};
    const now = new Date();

    if (validDate) {
      const selectedDate = parseISO(validDate);
      dateFilter = {
        slot_datetime: {
          gte: startOfDay(selectedDate),
          lte: endOfDay(selectedDate),
        },
      };
    } else if (validStartDate && validEndDate) {
      dateFilter = {
        slot_datetime: {
          gte: parseISO(validStartDate),
          lte: parseISO(validEndDate),
        },
      };
    } else if (validStatus === "today") {
      dateFilter = {
        slot_datetime: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
      };
    } else if (validStatus === "week") {
      dateFilter = {
        slot_datetime: {
          gte: startOfWeek(now),
          lte: endOfWeek(now),
        },
      };
    } else if (validStatus === "upcoming") {
      dateFilter = {
        slot_datetime: {
          gte: now,
        },
      };
    }

    // Build staff filter
    const staffFilter = validStaffId ? { staff_id: validStaffId } : {};

    // Fetch bookings with related data
    const bookings = await prisma.booking.findMany({
      where: {
        ...dateFilter,
        ...staffFilter,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            photo_url: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration_minutes: true,
            base_price: true,
          },
        },
      },
      orderBy: {
        slot_datetime: "asc",
      },
      take: validLimit,
    });

    return NextResponse.json({
      success: true,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        staff_id: booking.staff_id,
        service_id: booking.service_id,
        slot_datetime: booking.slot_datetime,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_email: booking.customer_email,
        customer_id: booking.customer_id,
        final_price: booking.final_price,
        created_at: booking.created_at,
        staff: booking.staff,
        service: booking.service,
      })),
      count: bookings.length,
      filters: {
        date: validDate,
        startDate: validStartDate,
        endDate: validEndDate,
        staffId: validStaffId,
        status: validStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching admin bookings:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bookings. Please try again later.",
        bookings: [],
      },
      { status: 500 }
    );
  }
}
