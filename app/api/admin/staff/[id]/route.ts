import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for staff update
const StaffUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  bio: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  services: z.array(z.string()).optional(),
  servicePricing: z
    .array(
      z.object({
        serviceId: z.string(),
        customPrice: z.number().int().min(0).nullable(), // null to remove custom pricing
      })
    )
    .optional(),
});

/**
 * PUT - Update staff member details and service assignments
 * Admin-only endpoint for staff management
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
    const validationResult = StaffUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid staff data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, bio, photo_url, services, servicePricing } =
      validationResult.data;

    const prisma = PrismaService.getInstance();

    // Check if staff member exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        user: true,
        staffServicePricing: true,
      },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Use transaction to ensure atomicity
    const updatedStaff = await prisma.$transaction(async (tx) => {
      // Update basic staff information
      const staffUpdate: {
        name?: string;
        bio?: string | null;
        photo_url?: string | null;
        services?: string[];
      } = {};
      if (name !== undefined) staffUpdate.name = name;
      if (bio !== undefined) staffUpdate.bio = bio;
      if (photo_url !== undefined) staffUpdate.photo_url = photo_url;
      if (services !== undefined) staffUpdate.services = services;

      let staff = existingStaff;
      if (Object.keys(staffUpdate).length > 0) {
        staff = await tx.staff.update({
          where: { id: staffId },
          data: staffUpdate,
          include: {
            user: true,
            staffServicePricing: {
              include: {
                service: true,
              },
            },
          },
        });
      }

      // Update service pricing if provided
      if (servicePricing) {
        for (const pricing of servicePricing) {
          const { serviceId, customPrice } = pricing;

          // Check if service exists
          const service = await tx.service.findUnique({
            where: { id: serviceId },
          });

          if (!service) {
            throw new Error(`Service with ID ${serviceId} not found`);
          }

          // Find existing pricing record
          const existingPricing = await tx.staffServicePricing.findFirst({
            where: {
              staff_id: staffId,
              service_id: serviceId,
            },
          });

          if (customPrice === null) {
            // Remove custom pricing if it exists
            if (existingPricing) {
              await tx.staffServicePricing.delete({
                where: { id: existingPricing.id },
              });
            }
          } else {
            // Create or update custom pricing
            if (existingPricing) {
              await tx.staffServicePricing.update({
                where: { id: existingPricing.id },
                data: { custom_price: customPrice },
              });
            } else {
              await tx.staffServicePricing.create({
                data: {
                  staff_id: staffId,
                  service_id: serviceId,
                  custom_price: customPrice,
                },
              });
            }
          }
        }
      }

      // Fetch updated staff with all relations
      return await tx.staff.findUnique({
        where: { id: staffId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          staffServicePricing: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  base_price: true,
                },
              },
            },
          },
          staffAvailability: {
            select: {
              day_of_week: true,
              start_time: true,
              end_time: true,
              override_date: true,
            },
          },
        },
      });
    });

    if (!updatedStaff) {
      throw new Error("Failed to update staff member");
    }

    // Transform response data
    const transformedStaff = {
      id: updatedStaff.id,
      user_id: updatedStaff.user_id,
      name: updatedStaff.name,
      bio: updatedStaff.bio,
      photo_url: updatedStaff.photo_url,
      services: updatedStaff.services,
      created_at: updatedStaff.created_at,
      user: updatedStaff.user,
      serviceDetails: updatedStaff.services.map((serviceId) => {
        const customPricing = updatedStaff.staffServicePricing.find(
          (sp) => sp.service.id === serviceId
        );
        return {
          id: serviceId,
          name: customPricing?.service.name || "Unknown Service",
          base_price: customPricing?.service.base_price || 0,
          custom_price: customPricing?.custom_price || null,
        };
      }),
      availabilityCount: new Set(
        updatedStaff.staffAvailability
          .filter((avail) => !avail.override_date)
          .map((avail) => avail.day_of_week)
      ).size,
    };

    return NextResponse.json({
      success: true,
      message: "Staff member updated successfully",
      staff: transformedStaff,
    });
  } catch (error) {
    console.error("Error updating staff member:", error);

    return NextResponse.json(
      {
        error: "Failed to update staff member",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch specific staff member details
 * Admin-only endpoint for staff editing form
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

    // Fetch staff member with all details
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            created_at: true,
          },
        },
        staffServicePricing: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                base_price: true,
                duration_minutes: true,
              },
            },
          },
        },
        staffAvailability: true,
        bookings: {
          where: {
            slot_datetime: {
              gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            slot_datetime: true,
            final_price: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Transform response
    const transformedStaff = {
      id: staff.id,
      user_id: staff.user_id,
      name: staff.name,
      bio: staff.bio,
      photo_url: staff.photo_url,
      services: staff.services,
      created_at: staff.created_at,
      user: staff.user,
      serviceDetails: staff.services.map((serviceId) => {
        const customPricing = staff.staffServicePricing.find(
          (sp) => sp.service.id === serviceId
        );
        return {
          id: serviceId,
          name: customPricing?.service.name || "Unknown Service",
          base_price: customPricing?.service.base_price || 0,
          custom_price: customPricing?.custom_price || null,
          duration_minutes: customPricing?.service.duration_minutes || 0,
        };
      }),
      availabilitySchedule: staff.staffAvailability,
      stats: {
        recentBookings: staff.bookings.length,
        recentRevenue: staff.bookings.reduce(
          (sum, b) => sum + b.final_price,
          0
        ),
      },
    };

    return NextResponse.json({
      success: true,
      staff: transformedStaff,
    });
  } catch (error) {
    console.error("Error fetching staff details:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch staff details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
