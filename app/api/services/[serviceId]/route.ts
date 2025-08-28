/**
 * Individual Service API
 * Endpoint for fetching details of a specific service
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaService } from "@/lib/services/PrismaService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Service ID is required",
        },
        { status: 400 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Fetch the specific service
    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        id: true,
        name: true,
        duration_minutes: true,
        base_price: true,
        created_at: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: "Service not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      service,
    });
  } catch (error) {
    console.error("Error fetching service:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch service details. Please try again later.",
      },
      { status: 500 }
    );
  }
}
