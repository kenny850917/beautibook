import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { PrismaService } from "@/lib/services/PrismaService";
import { DayOfWeek } from "@prisma/client";

// Validation schema for staff self-service availability updates with blocks
const StaffAvailabilitySchema = z.object({
  schedules: z
    .array(
      z.object({
        day_of_week: z.enum([
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
          "SUNDAY",
        ]),
        start_time: z
          .string()
          .regex(
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "Invalid time format (HH:MM)"
          ),
        end_time: z
          .string()
          .regex(
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "Invalid time format (HH:MM)"
          ),
        is_available: z.boolean(),
        blocks: z
          .array(
            z.object({
              id: z.string().optional(), // For updating existing blocks
              block_start_time: z
                .string()
                .regex(
                  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                  "Invalid time format"
                ),
              block_end_time: z
                .string()
                .regex(
                  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                  "Invalid time format"
                ),
              block_type: z.enum(["lunch", "break", "appointment", "personal"]),
              title: z.string().min(1, "Block title is required"),
              is_recurring: z.boolean().default(true),
            })
          )
          .optional(),
      })
    )
    .optional(),
  timeOffRequest: z
    .object({
      start_date: z.string().datetime(),
      end_date: z.string().datetime(),
      reason: z.string().optional(),
    })
    .optional(),
});

/**
 * GET - Fetch current staff member's availability schedule
 * Staff-only endpoint for viewing own schedule
 */
export async function GET(request: NextRequest) {
  try {
    // Verify staff authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || !["STAFF", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = PrismaService.getInstance();

    // Find staff member by user ID
    const staff = await prisma.staff.findUnique({
      where: { user_id: session.user.id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff record not found" },
        { status: 404 }
      );
    }

    // Fetch current availability with schedule blocks
    const availability = await prisma.staffAvailability.findMany({
      where: { staff_id: staff.id },
      include: {
        scheduleBlocks: {
          orderBy: [{ block_start_time: "asc" }],
        },
      },
      orderBy: [
        { override_date: "asc" },
        { day_of_week: "asc" },
        { start_time: "asc" },
      ],
    });

    // Fetch upcoming bookings for context
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        staff_id: staff.id,
        slot_datetime: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        },
      },
      include: {
        service: {
          select: {
            name: true,
            duration_minutes: true,
          },
        },
      },
      orderBy: {
        slot_datetime: "asc",
      },
    });

    // Separate regular schedules from date overrides
    const regularSchedule = availability.filter((a) => !a.override_date);
    const overrides = availability.filter((a) => a.override_date);

    // Group regular schedule by day with schedule blocks
    const weeklySchedule = {
      MONDAY: regularSchedule
        .filter((a) => a.day_of_week === "MONDAY")
        .map((schedule) => ({
          ...schedule,
          blocks: schedule.scheduleBlocks.map((block) => ({
            id: block.id,
            block_start_time: block.block_start_time,
            block_end_time: block.block_end_time,
            block_type: block.block_type,
            title: block.title,
            is_recurring: block.is_recurring,
          })),
        })),
      TUESDAY: regularSchedule
        .filter((a) => a.day_of_week === "TUESDAY")
        .map((schedule) => ({
          ...schedule,
          blocks: schedule.scheduleBlocks.map((block) => ({
            id: block.id,
            block_start_time: block.block_start_time,
            block_end_time: block.block_end_time,
            block_type: block.block_type,
            title: block.title,
            is_recurring: block.is_recurring,
          })),
        })),
      WEDNESDAY: regularSchedule
        .filter((a) => a.day_of_week === "WEDNESDAY")
        .map((schedule) => ({
          ...schedule,
          blocks: schedule.scheduleBlocks.map((block) => ({
            id: block.id,
            block_start_time: block.block_start_time,
            block_end_time: block.block_end_time,
            block_type: block.block_type,
            title: block.title,
            is_recurring: block.is_recurring,
          })),
        })),
      THURSDAY: regularSchedule
        .filter((a) => a.day_of_week === "THURSDAY")
        .map((schedule) => ({
          ...schedule,
          blocks: schedule.scheduleBlocks.map((block) => ({
            id: block.id,
            block_start_time: block.block_start_time,
            block_end_time: block.block_end_time,
            block_type: block.block_type,
            title: block.title,
            is_recurring: block.is_recurring,
          })),
        })),
      FRIDAY: regularSchedule
        .filter((a) => a.day_of_week === "FRIDAY")
        .map((schedule) => ({
          ...schedule,
          blocks: schedule.scheduleBlocks.map((block) => ({
            id: block.id,
            block_start_time: block.block_start_time,
            block_end_time: block.block_end_time,
            block_type: block.block_type,
            title: block.title,
            is_recurring: block.is_recurring,
          })),
        })),
      SATURDAY: regularSchedule
        .filter((a) => a.day_of_week === "SATURDAY")
        .map((schedule) => ({
          ...schedule,
          blocks: schedule.scheduleBlocks.map((block) => ({
            id: block.id,
            block_start_time: block.block_start_time,
            block_end_time: block.block_end_time,
            block_type: block.block_type,
            title: block.title,
            is_recurring: block.is_recurring,
          })),
        })),
      SUNDAY: regularSchedule
        .filter((a) => a.day_of_week === "SUNDAY")
        .map((schedule) => ({
          ...schedule,
          blocks: schedule.scheduleBlocks.map((block) => ({
            id: block.id,
            block_start_time: block.block_start_time,
            block_end_time: block.block_end_time,
            block_type: block.block_type,
            title: block.title,
            is_recurring: block.is_recurring,
          })),
        })),
    };

    return NextResponse.json({
      success: true,
      staff,
      availability: {
        weeklySchedule,
        overrides: overrides.map((override) => ({
          id: override.id,
          date: override.override_date,
          start_time: override.start_time,
          end_time: override.end_time,
          type:
            override.start_time && override.end_time
              ? "special_hours"
              : "time_off",
        })),
      },
      upcomingBookings: upcomingBookings.map((booking) => ({
        id: booking.id,
        datetime: booking.slot_datetime,
        service: booking.service.name,
        duration: booking.service.duration_minutes,
        customer: booking.customer_name,
      })),
    });
  } catch (error) {
    console.error("Error fetching staff availability:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch availability",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update staff member's own availability schedule
 * Staff-only endpoint for self-service schedule management
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify staff authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || !["STAFF", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = StaffAvailabilitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid data",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { schedules = [], timeOffRequest } = validation.data;
    const prisma = PrismaService.getInstance();

    // Find staff member by user ID
    const staff = await prisma.staff.findUnique({
      where: { user_id: session.user.id },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff record not found" },
        { status: 404 }
      );
    }

    // Validate time logic
    for (const schedule of schedules) {
      if (schedule.is_available) {
        const startTime = schedule.start_time;
        const endTime = schedule.end_time;

        if (startTime >= endTime) {
          return NextResponse.json(
            {
              error: `Invalid time range for ${schedule.day_of_week}: end time must be after start time`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Check for conflicts with existing bookings
    const now = new Date();
    const futureBookings = await prisma.booking.findMany({
      where: {
        staff_id: staff.id,
        slot_datetime: {
          gte: now,
        },
      },
      select: {
        slot_datetime: true,
        service: {
          select: {
            duration_minutes: true,
          },
        },
      },
    });

    const conflicts: string[] = [];

    // Update availability in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Handle regular schedule updates (only if provided)
      if (schedules.length > 0) {
        // Check each day being updated
        for (const schedule of schedules) {
          const dayBookings = futureBookings.filter((booking) => {
            const bookingDay = booking.slot_datetime.getDay();
            const scheduleDay = {
              SUNDAY: 0,
              MONDAY: 1,
              TUESDAY: 2,
              WEDNESDAY: 3,
              THURSDAY: 4,
              FRIDAY: 5,
              SATURDAY: 6,
            }[schedule.day_of_week];

            return bookingDay === scheduleDay;
          });

          // If making unavailable or reducing hours, check for conflicts
          if (!schedule.is_available || dayBookings.length > 0) {
            for (const booking of dayBookings) {
              const bookingTime = booking.slot_datetime
                .toTimeString()
                .slice(0, 5);

              if (
                !schedule.is_available ||
                bookingTime < schedule.start_time ||
                bookingTime >= schedule.end_time
              ) {
                conflicts.push(
                  `Existing booking on ${schedule.day_of_week} at ${bookingTime}`
                );
              }
            }
          }
        }

        // If no conflicts, proceed with update
        if (conflicts.length === 0) {
          // Remove existing regular schedules for affected days (this will cascade delete blocks)
          const daysToUpdate = schedules.map((s) => s.day_of_week as DayOfWeek);
          await tx.staffAvailability.deleteMany({
            where: {
              staff_id: staff.id,
              day_of_week: { in: daysToUpdate },
              override_date: null,
            },
          });

          // Add new schedules (only for available days)
          const availableSchedules = schedules.filter((s) => s.is_available);
          for (const schedule of availableSchedules) {
            // Create the main availability record
            const createdAvailability = await tx.staffAvailability.create({
              data: {
                staff_id: staff.id,
                day_of_week: schedule.day_of_week as DayOfWeek,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
              },
            });

            // Create schedule blocks if any
            if (schedule.blocks && schedule.blocks.length > 0) {
              await tx.scheduleBlock.createMany({
                data: schedule.blocks.map((block) => ({
                  staff_availability_id: createdAvailability.id,
                  block_start_time: block.block_start_time,
                  block_end_time: block.block_end_time,
                  block_type: block.block_type,
                  title: block.title,
                  is_recurring: block.is_recurring ?? true,
                })),
              });
            }
          }
        }
      }

      // Handle time off request
      if (timeOffRequest && conflicts.length === 0) {
        const startDate = new Date(timeOffRequest.start_date);
        const endDate = new Date(timeOffRequest.end_date);

        // Create time off entries for each day in the range
        const timeOffDays: Date[] = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          timeOffDays.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create override entries for time off
        await tx.staffAvailability.createMany({
          data: timeOffDays.map((date) => ({
            staff_id: staff.id,
            day_of_week: "MONDAY" as DayOfWeek, // Required but ignored for overrides
            start_time: "00:00",
            end_time: "00:00",
            override_date: date,
          })),
        });
      }

      return { success: true };
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "Schedule conflicts detected",
          conflicts,
          message:
            "Cannot update schedule due to existing bookings. Please contact admin for assistance.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: timeOffRequest
        ? "Schedule updated and time off request submitted successfully"
        : "Schedule updated successfully",
    });
  } catch (error) {
    console.error("Error updating staff availability:", error);

    return NextResponse.json(
      {
        error: "Failed to update availability",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
