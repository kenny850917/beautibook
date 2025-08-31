import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for staff pricing creation
const CreateStaffPricingSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  customPrice: z.number().int().min(1, "Custom price must be greater than 0"),
});

/**
 * POST - Add staff pricing override for a service
 * Admin-only endpoint for managing staff-specific pricing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: serviceId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateStaffPricingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid staff pricing data",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { staffId, customPrice } = validation.data;
    const prisma = PrismaService.getInstance();

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Verify staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
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

    // Check if staff pricing override already exists
    const existingPricing = await prisma.staffServicePricing.findUnique({
      where: {
        staff_id_service_id: {
          staff_id: staffId,
          service_id: serviceId,
        },
      },
    });

    if (existingPricing) {
      return NextResponse.json(
        { error: "Staff pricing override already exists for this service" },
        { status: 409 }
      );
    }

    // Create the staff pricing override
    const staffPricing = await prisma.staffServicePricing.create({
      data: {
        staff_id: staffId,
        service_id: serviceId,
        custom_price: customPrice,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate updated service statistics
    const updatedService = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        staffServicePricing: true,
      },
    });

    let averagePrice = service.base_price;
    if (updatedService?.staffServicePricing) {
      const allPrices = [
        service.base_price,
        ...updatedService.staffServicePricing.map((sp) => sp.custom_price),
      ];
      averagePrice = Math.round(
        allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
      );
    }

    return NextResponse.json({
      success: true,
      staffPricing,
      updatedService: {
        averagePrice,
        hasOverrides: true,
      },
      message: "Staff pricing override created successfully",
    });
  } catch (error) {
    console.error("Error creating staff pricing:", error);

    return NextResponse.json(
      {
        error: "Failed to create staff pricing override",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
