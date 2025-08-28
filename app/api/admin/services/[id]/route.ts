import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for service update
const ServiceUpdateSchema = z.object({
  name: z.string().min(1, "Service name is required").optional(),
  duration_minutes: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .optional(),
  base_price: z.number().int().min(0, "Price must be non-negative").optional(),
});

/**
 * PUT - Update service base pricing and details
 * Admin-only endpoint for pricing management
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

    // Get service ID from params
    const { id: serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ServiceUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid service data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, duration_minutes, base_price } = validationResult.data;

    const prisma = PrismaService.getInstance();

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        staffServicePricing: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!existingService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Build update object
    const updateData: {
      name?: string;
      duration_minutes?: number;
      base_price?: number;
    } = {};
    if (name !== undefined) updateData.name = name;
    if (duration_minutes !== undefined)
      updateData.duration_minutes = duration_minutes;
    if (base_price !== undefined) updateData.base_price = base_price;

    // Update service
    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: {
        staffServicePricing: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        bookings: {
          where: {
            slot_datetime: {
              gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            final_price: true,
          },
        },
      },
    });

    // Transform response data
    const recentBookings = updatedService.bookings;
    const recentRevenue = recentBookings.reduce(
      (sum, booking) => sum + booking.final_price,
      0
    );

    // Calculate average price including staff overrides
    const allPrices = [
      updatedService.base_price,
      ...updatedService.staffServicePricing.map((sp) => sp.custom_price),
    ];
    const averagePrice =
      allPrices.length > 0
        ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
        : updatedService.base_price;

    const transformedService = {
      id: updatedService.id,
      name: updatedService.name,
      duration_minutes: updatedService.duration_minutes,
      base_price: updatedService.base_price,
      created_at: updatedService.created_at,
      staffPricing: updatedService.staffServicePricing.map((sp) => ({
        id: sp.id,
        staff_id: sp.staff_id,
        service_id: sp.service_id,
        custom_price: sp.custom_price,
        staff: sp.staff,
      })),
      averagePrice: Math.round(averagePrice),
      hasOverrides: updatedService.staffServicePricing.length > 0,
      stats: {
        recentBookings: recentBookings.length,
        recentRevenue,
        avgBookingValue:
          recentBookings.length > 0 ? recentRevenue / recentBookings.length : 0,
      },
    };

    return NextResponse.json({
      success: true,
      message: "Service updated successfully",
      service: transformedService,
    });
  } catch (error) {
    console.error("Error updating service:", error);

    return NextResponse.json(
      {
        error: "Failed to update service",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch specific service details with pricing
 * Admin-only endpoint for service editing form
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

    // Get service ID from params
    const { id: serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Fetch service with all details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        staffServicePricing: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
            staff: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Transform response
    const recentBookings = service.bookings;
    const recentRevenue = recentBookings.reduce(
      (sum, booking) => sum + booking.final_price,
      0
    );

    // Calculate statistics
    const allPrices = [
      service.base_price,
      ...service.staffServicePricing.map((sp) => sp.custom_price),
    ];
    const averagePrice =
      allPrices.length > 0
        ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
        : service.base_price;

    const transformedService = {
      id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
      base_price: service.base_price,
      created_at: service.created_at,
      staffPricing: service.staffServicePricing.map((sp) => ({
        id: sp.id,
        staff_id: sp.staff_id,
        service_id: sp.service_id,
        custom_price: sp.custom_price,
        staff: sp.staff,
      })),
      averagePrice: Math.round(averagePrice),
      hasOverrides: service.staffServicePricing.length > 0,
      stats: {
        recentBookings: recentBookings.length,
        recentRevenue,
        avgBookingValue:
          recentBookings.length > 0 ? recentRevenue / recentBookings.length : 0,
        recentBookingsByStaff: recentBookings.reduce((acc, booking) => {
          const staffName = booking.staff?.name || "Unknown";
          acc[staffName] = (acc[staffName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };

    return NextResponse.json({
      success: true,
      service: transformedService,
    });
  } catch (error) {
    console.error("Error fetching service details:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch service details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
