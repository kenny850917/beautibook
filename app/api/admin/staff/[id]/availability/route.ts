import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { PrismaService } from "@/lib/services/PrismaService";
import { getCurrentUtcTime } from "@/lib/utils/calendar";
import { DayOfWeek } from "@prisma/client";

// Validation schema for block-based availability updates
const AvailabilityUpdateSchema = z.object({
  schedules: z
    .array(
      z.object({
        id: z.string().optional(), // For updates (existing records)
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
        is_available: z.boolean(), // To handle removing availability
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
  overrides: z
    .array(
      z.object({
        id: z.string().optional(),
        override_date: z.string().datetime(),
        start_time: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
          .optional(),
        end_time: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
          .optional(),
        is_available: z.boolean(), // false = time off, true = special availability
      })
    )
    .optional(),
});

/**
 * GET - Fetch staff availability schedule
 * Admin-only endpoint for managing staff schedules
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff ID from params
    const { id: staffId } = await params;

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Verify staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Fetch current availability with schedule blocks
    const availability = await prisma.staffAvailability.findMany({
      where: { staff_id: staffId },
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
    });
  } catch (error) {
    console.error("Error fetching staff availability:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch staff availability",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update staff availability schedule
 * Admin-only endpoint for managing staff schedules
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff ID from params
    const { id: staffId } = await params;

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = AvailabilityUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid data",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { schedules = [], overrides = [] } = validation.data;
    const prisma = PrismaService.getInstance();

    // Verify staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Validate time logic for working hours and blocks
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

        // Validate schedule blocks
        if (schedule.blocks) {
          for (const block of schedule.blocks) {
            // Block times must be valid
            if (block.block_start_time >= block.block_end_time) {
              return NextResponse.json(
                {
                  error: `Invalid block time range for ${block.title}: end time must be after start time`,
                },
                { status: 400 }
              );
            }

            // Block must be within working hours
            if (
              block.block_start_time < startTime ||
              block.block_end_time > endTime
            ) {
              return NextResponse.json(
                {
                  error: `Block "${block.title}" extends outside working hours (${startTime} - ${endTime})`,
                },
                { status: 400 }
              );
            }
          }

          // Check for overlapping blocks
          const sortedBlocks = [...schedule.blocks].sort((a, b) =>
            a.block_start_time.localeCompare(b.block_start_time)
          );

          for (let i = 0; i < sortedBlocks.length - 1; i++) {
            const current = sortedBlocks[i];
            const next = sortedBlocks[i + 1];

            if (current.block_end_time > next.block_start_time) {
              return NextResponse.json(
                {
                  error: `Overlapping blocks: "${current.title}" and "${next.title}"`,
                },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // ✅ UTC NORMALIZATION: Check for conflicts with existing bookings using UTC utilities
    const now = getCurrentUtcTime();
    const existingBookings = await prisma.booking.findMany({
      where: {
        staff_id: staffId,
        slot_datetime: {
          gte: now,
        },
      },
    });

    // Update availability in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Handle regular schedules with blocks
      if (schedules.length > 0) {
        // Remove existing regular schedules for affected days (this will cascade delete blocks)
        const daysToUpdate = schedules.map((s) => s.day_of_week as DayOfWeek);
        await tx.staffAvailability.deleteMany({
          where: {
            staff_id: staffId,
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
              staff_id: staffId,
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

      // Handle date overrides
      if (overrides.length > 0) {
        for (const override of overrides) {
          if (override.id) {
            // Update existing override
            await tx.staffAvailability.update({
              where: { id: override.id },
              data: {
                override_date: new Date(
                  override.override_date + "T00:00:00.000Z"
                ),
                start_time: override.is_available
                  ? override.start_time!
                  : "00:00",
                end_time: override.is_available ? override.end_time! : "00:00",
                day_of_week: "MONDAY", // Required field, but ignored for overrides
              },
            });
          } else {
            // Create new override
            await tx.staffAvailability.create({
              data: {
                staff_id: staffId,
                day_of_week: "MONDAY", // Required field, but ignored for overrides
                start_time: override.is_available
                  ? override.start_time!
                  : "00:00",
                end_time: override.is_available ? override.end_time! : "00:00",
                override_date: new Date(
                  override.override_date + "T00:00:00.000Z"
                ),
              },
            });
          }
        }
      }

      return { success: true };
    });

    return NextResponse.json({
      success: true,
      message: "Staff availability updated successfully",
      conflictWarnings:
        existingBookings.length > 0
          ? [
              `Note: ${existingBookings.length} existing bookings may be affected by these changes`,
            ]
          : [],
    });
  } catch (error) {
    console.error("Error updating staff availability:", error);

    return NextResponse.json(
      {
        error: "Failed to update staff availability",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
