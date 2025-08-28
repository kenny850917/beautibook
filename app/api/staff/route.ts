/**
 * Staff API
 * Endpoint for fetching staff members, optionally filtered by service
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaService } from "@/lib/services/PrismaService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("service");

    const prisma = PrismaService.getInstance();

    // Base query for staff
    const whereClause = serviceId
      ? {
          services: {
            has: serviceId, // Staff can perform this service
          },
        }
      : {};

    // Fetch staff members
    const staff = await prisma.staff.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        bio: true,
        photo_url: true,
        services: true,
        created_at: true,
        // Include custom pricing if filtering by service
        staffServicePricing: serviceId
          ? {
              where: {
                service_id: serviceId,
              },
              select: {
                custom_price: true,
              },
            }
          : false,
      },
      orderBy: {
        created_at: "asc", // Senior staff first
      },
    });

    // Transform data to include custom pricing
    const transformedStaff = staff.map((member) => ({
      id: member.id,
      name: member.name,
      bio: member.bio,
      photo_url: member.photo_url,
      services: member.services,
      customPrice: member.staffServicePricing?.[0]?.custom_price || null,
    }));

    return NextResponse.json({
      success: true,
      staff: transformedStaff,
      count: transformedStaff.length,
      serviceId,
    });
  } catch (error) {
    console.error("Error fetching staff:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch staff members. Please try again later.",
        staff: [],
      },
      { status: 500 }
    );
  }
}
