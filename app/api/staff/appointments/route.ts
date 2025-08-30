/**
 * Staff Appointments API
 * Endpoint for staff to fetch their own appointments
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns";

// Validation schema for staff appointment queries
const StaffAppointmentQuerySchema = z.object({
  date: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  status: z
    .enum(["all", "today", "week", "upcoming", "past"])
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
    // Check authentication and get staff session
    const session = await getServerSession(authOptions);

    if (!session?.user?.staffId) {
      return NextResponse.json(
        { error: "Staff authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");

    // Validate input
    const validationResult = StaffAppointmentQuerySchema.safeParse({
      date,
      startDate,
      endDate,
      status,
      limit,
    });

    if (!validationResult.success) {
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
    } else if (validStatus === "past") {
      dateFilter = {
        slot_datetime: {
          lt: now,
        },
      };
    }

    // Fetch staff's appointments with related data
    const appointments = await prisma.booking.findMany({
      where: {
        staff_id: session.user.staffId, // Filter by logged-in staff
        ...dateFilter,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
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

    // Transform appointments for staff component
    const transformedAppointments = appointments.map((appointment) => ({
      id: appointment.id,
      title: `${appointment.service.name} - ${appointment.customer_name}`,
      staff_id: appointment.staff_id,
      service_id: appointment.service_id,
      slot_datetime: appointment.slot_datetime,
      customer_name: appointment.customer_name,
      customer_phone: appointment.customer_phone,
      customer_email: appointment.customer_email,
      customer_id: appointment.customer_id,
      final_price: appointment.final_price,
      status: appointment.status, // Added missing status field
      notes: appointment.notes, // Added missing notes field
      created_at: appointment.created_at,
      staff: appointment.staff,
      service: appointment.service,
    }));

    return NextResponse.json({
      success: true,
      appointments: transformedAppointments,
      count: appointments.length,
      staffId: session.user.staffId,
      filters: {
        date: validDate,
        startDate: validStartDate,
        endDate: validEndDate,
        status: validStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching staff appointments:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch appointments. Please try again later.",
        appointments: [],
      },
      { status: 500 }
    );
  }
}
