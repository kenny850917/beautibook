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

    const allStaff = await prisma.staff.findMany({
      select: {
        id: true,
        name: true,
        bio: true,
        photo_url: true,
        services: true,
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // Filter staff who can perform this service if serviceId provided
    const staff = serviceId
      ? allStaff.filter(
          (member) => member.services && member.services.includes(serviceId)
        )
      : allStaff;

    // Get custom pricing separately for the filtered staff
    const staffWithPricing = await Promise.all(
      staff.map(async (member) => {
        let customPrice = null;
        if (serviceId) {
          const pricing = await prisma.staffServicePricing.findFirst({
            where: {
              staff_id: member.id,
              service_id: serviceId,
            },
            select: {
              custom_price: true,
            },
          });
          customPrice = pricing?.custom_price || null;
        }

        return {
          id: member.id,
          name: member.name,
          bio: member.bio,
          photo_url: member.photo_url,
          services: member.services,
          customPrice,
        };
      })
    );

    return NextResponse.json({
      success: true,
      staff: staffWithPricing,
      count: staffWithPricing.length,
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
