/**
 * Individual Staff API
 * Endpoint for fetching details of a specific staff member
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaService } from "@/lib/services/PrismaService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;

    if (!staffId) {
      return NextResponse.json(
        {
          success: false,
          error: "Staff ID is required",
        },
        { status: 400 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Fetch the specific staff member
    const staff = await prisma.staff.findUnique({
      where: {
        id: staffId,
      },
      select: {
        id: true,
        name: true,
        bio: true,
        photo_url: true,
        services: true,
        created_at: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          error: "Staff member not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error("Error fetching staff member:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch staff member details. Please try again later.",
      },
      { status: 500 }
    );
  }
}
