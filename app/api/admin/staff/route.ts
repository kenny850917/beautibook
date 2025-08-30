import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for creating new staff
const CreateStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  bio: z.string().optional(),
  services: z.array(z.string()).optional(),
  temporaryPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

/**
 * GET - Fetch all staff members with comprehensive admin data
 * Admin-only endpoint for staff management dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = PrismaService.getInstance();

    // Fetch staff members with comprehensive data
    const staff = await prisma.staff.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            created_at: true,
          },
        },
        staffServicePricing: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                base_price: true,
              },
            },
          },
        },
        staffAvailability: {
          select: {
            id: true,
            day_of_week: true,
            start_time: true,
            end_time: true,
            override_date: true,
          },
        },
        bookings: {
          where: {
            slot_datetime: {
              gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          select: {
            id: true,
            slot_datetime: true,
            final_price: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // Fetch all services for reference
    const allServices = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        base_price: true,
        duration_minutes: true,
      },
    });

    // Transform data for admin dashboard
    const transformedStaff = staff.map((member) => {
      // Calculate availability count (days per week)
      const availabilityCount = new Set(
        member.staffAvailability
          .filter((avail) => !avail.override_date) // Only count weekly availability, not overrides
          .map((avail) => avail.day_of_week)
      ).size;

      // Calculate recent bookings stats
      const recentBookings = member.bookings;
      const recentRevenue = recentBookings.reduce(
        (sum, booking) => sum + booking.final_price,
        0
      );

      // Map services with pricing details
      const serviceDetails = member.services
        .map((serviceId) => {
          const service = allServices.find((s) => s.id === serviceId);
          const customPricing = member.staffServicePricing.find(
            (sp) => sp.service.id === serviceId
          );

          if (!service) return null; // Skip if service not found

          return {
            id: service.id,
            name: service.name,
            base_price: service.base_price,
            custom_price: customPricing?.custom_price || null,
            duration_minutes: service.duration_minutes,
          };
        })
        .filter(Boolean); // Remove null entries

      return {
        id: member.id,
        user_id: member.user_id,
        name: member.name,
        bio: member.bio,
        photo_url: member.photo_url,
        services: member.services,
        created_at: member.created_at,
        user: member.user,
        serviceDetails,
        availabilityCount,
        availabilitySchedule: member.staffAvailability,
        stats: {
          recentBookings: recentBookings.length,
          recentRevenue,
          avgBookingValue:
            recentBookings.length > 0
              ? recentRevenue / recentBookings.length
              : 0,
        },
      };
    });

    // Calculate summary statistics
    const summary = {
      totalStaff: transformedStaff.length,
      activeStaff: transformedStaff.filter((s) => s.availabilityCount >= 3)
        .length,
      totalServices: allServices.length,
      averageAvailability:
        transformedStaff.length > 0
          ? transformedStaff.reduce((sum, s) => sum + s.availabilityCount, 0) /
            transformedStaff.length
          : 0,
      totalRecentBookings: transformedStaff.reduce(
        (sum, s) => sum + s.stats.recentBookings,
        0
      ),
      totalRecentRevenue: transformedStaff.reduce(
        (sum, s) => sum + s.stats.recentRevenue,
        0
      ),
    };

    return NextResponse.json({
      success: true,
      staff: transformedStaff,
      services: allServices,
      summary,
    });
  } catch (error) {
    console.error("Error fetching admin staff data:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch staff data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new staff member with user account
 * Admin-only endpoint for adding new staff
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid data",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      bio,
      services = [],
      temporaryPassword,
    } = validation.data;
    const prisma = PrismaService.getInstance();

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Generate password (either provided or random)
    const password = temporaryPassword || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and staff in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          email,
          password_hash: hashedPassword,
          role: "STAFF",
        },
      });

      // Create staff record
      const staff = await tx.staff.create({
        data: {
          user_id: user.id,
          name,
          bio: bio || null,
          services,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              created_at: true,
            },
          },
        },
      });

      return { user, staff };
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: result.staff.id,
        user_id: result.staff.user_id,
        name: result.staff.name,
        bio: result.staff.bio,
        photo_url: result.staff.photo_url,
        services: result.staff.services,
        created_at: result.staff.created_at,
        user: result.staff.user,
        serviceDetails: [], // Will be populated when services are assigned
        availabilityCount: 0,
      },
      temporaryPassword: !temporaryPassword ? password : undefined, // Return generated password
      message: "Staff member created successfully",
    });
  } catch (error) {
    console.error("Error creating staff member:", error);

    return NextResponse.json(
      {
        error: "Failed to create staff member",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
