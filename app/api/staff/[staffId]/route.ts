/**
 * Individual Staff API
 * Endpoint for fetching details of a specific staff member
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for staff profile updates
const StaffUpdateSchema = z.object({
  bio: z.string().nullable().optional(),
  services: z.array(z.string()).optional(),
  servicePricing: z
    .array(
      z.object({
        serviceId: z.string(),
        customPrice: z.number().nullable(),
      })
    )
    .optional(),
});

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

    // Check if user is authenticated for additional data
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user;
    const isAuthorized =
      isAuthenticated &&
      (session.user.role === "ADMIN" || session.user.staffId === staffId);

    const prisma = PrismaService.getInstance();

    // Fetch staff member with conditional data based on authentication
    const baseSelect = {
      id: true,
      user_id: true,
      name: true,
      bio: true,
      photo_url: true,
      services: true,
      created_at: true,
      staffServicePricing: {
        select: {
          service_id: true,
          custom_price: true,
          service: {
            select: {
              id: true,
              name: true,
              base_price: true,
            },
          },
        },
      },
    };

    const authorizedSelect = {
      ...baseSelect,
      user: {
        select: {
          email: true,
          role: true,
        },
      },
      staffAvailability: {
        select: {
          id: true,
        },
      },
    };

    const staff = await prisma.staff.findUnique({
      where: {
        id: staffId,
      },
      select: isAuthorized ? authorizedSelect : baseSelect,
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

    // Format service details for easy frontend access
    const serviceDetails = staff.staffServicePricing.map((pricing) => ({
      id: pricing.service.id,
      name: pricing.service.name,
      base_price: pricing.service.base_price,
      custom_price: pricing.custom_price || undefined,
    }));

    // Create response with formatted staff data
    const formattedStaff: Record<string, unknown> = {
      id: staff.id,
      name: staff.name,
      bio: staff.bio,
      photo_url: staff.photo_url,
      services: staff.services,
      serviceDetails,
    };

    // Include sensitive data only for authorized users
    if (isAuthorized && "user" in staff && staff.user) {
      formattedStaff.user_id = staff.user_id;
      formattedStaff.user = {
        email: (staff.user as { email: string; role: string }).email,
        role: (staff.user as { email: string; role: string }).role,
      };

      if ("staffAvailability" in staff && staff.staffAvailability) {
        formattedStaff.availabilityCount =
          (staff.staffAvailability as { id: string }[]).length || 0;
      }
    }

    return NextResponse.json({
      success: true,
      staff: formattedStaff,
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

export async function PUT(
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

    // Check authentication - staff can only update their own data
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Staff can only update their own data, admins can update any staff data
    if (session.user.role !== "ADMIN" && session.user.staffId !== staffId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = StaffUpdateSchema.safeParse(body);
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

    const { bio, services, servicePricing } = validationResult.data;

    const prisma = PrismaService.getInstance();

    // Start a transaction to update staff data
    const result = await prisma.$transaction(async (tx) => {
      // Update basic staff information
      const updateData: { bio?: string | null; services?: string[] } = {};
      if (bio !== undefined) updateData.bio = bio;
      if (services !== undefined) updateData.services = services;

      const updatedStaff = await tx.staff.update({
        where: { id: staffId },
        data: updateData,
        select: {
          id: true,
          user_id: true,
          name: true,
          bio: true,
          photo_url: true,
          services: true,
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      });

      // Update service pricing if provided
      if (servicePricing && servicePricing.length > 0) {
        // Remove all existing pricing for this staff member
        await tx.staffServicePricing.deleteMany({
          where: { staff_id: staffId },
        });

        // Add new pricing entries
        const pricingEntries = servicePricing
          .filter((entry) => entry.customPrice !== null)
          .map((entry) => ({
            staff_id: staffId,
            service_id: entry.serviceId,
            custom_price: entry.customPrice!,
          }));

        if (pricingEntries.length > 0) {
          await tx.staffServicePricing.createMany({
            data: pricingEntries,
          });
        }
      }

      return updatedStaff;
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      staff: result,
    });
  } catch (error) {
    console.error("Error updating staff profile:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update profile. Please try again later.",
      },
      { status: 500 }
    );
  }
}
