/**
 * Staff Pricing Management API
 * Endpoint for managing staff-specific pricing overrides for services
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for staff pricing creation
const StaffPricingCreateSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  customPrice: z.number().positive("Custom price must be positive"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;

    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = StaffPricingCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { staffId, customPrice } = validationResult.data;

    const prisma = PrismaService.getInstance();

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    // Check if staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Check if staff pricing already exists for this service
    const existingPricing = await prisma.staffServicePricing.findFirst({
      where: {
        staff_id: staffId,
        service_id: serviceId,
      },
    });

    if (existingPricing) {
      return NextResponse.json(
        {
          success: false,
          error: "Staff pricing override already exists for this service",
        },
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
            name: true,
          },
        },
      },
    });

    // Calculate updated average price for the service
    const allPricingForService = await prisma.staffServicePricing.findMany({
      where: { service_id: serviceId },
    });

    const prices = [
      service.base_price,
      ...allPricingForService.map((p) => p.custom_price),
    ];
    const averagePrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return NextResponse.json({
      success: true,
      message: "Staff pricing override added successfully",
      staffPricing: {
        id: staffPricing.id,
        staff_id: staffPricing.staff_id,
        service_id: staffPricing.service_id,
        custom_price: staffPricing.custom_price,
        staff: staffPricing.staff,
      },
      updatedService: {
        averagePrice,
      },
    });
  } catch (error) {
    console.error("Error creating staff pricing:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to create staff pricing override. Please try again later.",
      },
      { status: 500 }
    );
  }
}


