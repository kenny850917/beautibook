/**
 * Services API
 * Public endpoint for fetching available services
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaService } from "@/lib/services/PrismaService";

export async function GET(request: NextRequest) {
  try {
    const prisma = PrismaService.getInstance();

    // Fetch all available services
    const services = await prisma.service.findMany({
      orderBy: {
        base_price: "asc", // Order by price, cheapest first
      },
      select: {
        id: true,
        name: true,
        duration_minutes: true,
        base_price: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      services,
      count: services.length,
    });
  } catch (error) {
    console.error("Error fetching services:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch services. Please try again later.",
        services: [],
      },
      { status: 500 }
    );
  }
}

