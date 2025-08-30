/**
 * Individual Staff Pricing Management API
 * Endpoint for updating and deleting specific staff pricing overrides
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for staff pricing updates
const StaffPricingUpdateSchema = z.object({
  customPrice: z.number().positive("Custom price must be positive"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const { id: serviceId, pricingId } = await params;

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
    const validationResult = StaffPricingUpdateSchema.safeParse(body);
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

    const { customPrice } = validationResult.data;

    const prisma = PrismaService.getInstance();

    // Check if staff pricing exists and belongs to the correct service
    const existingPricing = await prisma.staffServicePricing.findFirst({
      where: {
        id: pricingId,
        service_id: serviceId,
      },
      include: {
        staff: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingPricing) {
      return NextResponse.json(
        { success: false, error: "Staff pricing override not found" },
        { status: 404 }
      );
    }

    // Update the staff pricing override
    const updatedStaffPricing = await prisma.staffServicePricing.update({
      where: { id: pricingId },
      data: {
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
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

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
      message: "Staff pricing override updated successfully",
      staffPricing: {
        id: updatedStaffPricing.id,
        staff_id: updatedStaffPricing.staff_id,
        service_id: updatedStaffPricing.service_id,
        custom_price: updatedStaffPricing.custom_price,
        staff: updatedStaffPricing.staff,
      },
      updatedService: {
        averagePrice,
      },
    });
  } catch (error) {
    console.error("Error updating staff pricing:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to update staff pricing override. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const { id: serviceId, pricingId } = await params;

    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Check if staff pricing exists and belongs to the correct service
    const existingPricing = await prisma.staffServicePricing.findFirst({
      where: {
        id: pricingId,
        service_id: serviceId,
      },
    });

    if (!existingPricing) {
      return NextResponse.json(
        { success: false, error: "Staff pricing override not found" },
        { status: 404 }
      );
    }

    // Delete the staff pricing override
    await prisma.staffServicePricing.delete({
      where: { id: pricingId },
    });

    // Calculate updated average price for the service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    const allPricingForService = await prisma.staffServicePricing.findMany({
      where: { service_id: serviceId },
    });

    // If no overrides left, average price is just the base price
    const averagePrice =
      allPricingForService.length > 0
        ? [
            service.base_price,
            ...allPricingForService.map((p) => p.custom_price),
          ].reduce((sum, price) => sum + price, 0) /
          (allPricingForService.length + 1)
        : service.base_price;

    return NextResponse.json({
      success: true,
      message: "Staff pricing override removed successfully",
      updatedService: {
        averagePrice,
      },
    });
  } catch (error) {
    console.error("Error deleting staff pricing:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to remove staff pricing override. Please try again later.",
      },
      { status: 500 }
    );
  }
}


