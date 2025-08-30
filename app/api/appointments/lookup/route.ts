import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for guest appointment lookup
const GuestLookupSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(10, "Phone number must be exactly 10 digits"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

/**
 * POST - Guest appointment lookup
 * Security validation with phone + name verification
 * Returns upcoming and recent appointments for guest customers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input following backend.mdc patterns
    const validationResult = GuestLookupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { phone, name } = validationResult.data;

    // Normalize phone number (add leading + if needed)
    const normalizedPhone = phone.startsWith("+") ? phone : `+1${phone}`;

    // Use singleton PrismaService following backend.mdc
    const prisma = PrismaService.getInstance();

    // First, find customer by phone number
    const customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No appointments found for this phone number. Please check your information and try again.",
        },
        { status: 404 }
      );
    }

    // Security validation: verify name matches (case-insensitive)
    const customerNameLower = customer.name.toLowerCase().trim();
    const inputNameLower = name.toLowerCase().trim();

    if (customerNameLower !== inputNameLower) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Name doesn't match our records. Please enter your name exactly as it appears on your booking.",
        },
        { status: 403 }
      );
    }

    // Get customer's appointments with related data
    const appointments = await prisma.booking.findMany({
      where: {
        customer_id: customer.id,
      },
      include: {
        service: {
          select: {
            name: true,
            duration_minutes: true,
          },
        },
        staff: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        slot_datetime: "desc",
      },
    });

    // Format appointments for frontend
    const formattedAppointments = appointments.map((appointment) => ({
      id: appointment.id,
      service: {
        name: appointment.service.name,
        duration_minutes: appointment.service.duration_minutes,
      },
      staff: {
        name: appointment.staff.name,
      },
      slot_datetime: appointment.slot_datetime.toISOString(),
      customer_name: appointment.customer_name,
      final_price: appointment.final_price,
      created_at: appointment.created_at.toISOString(),
    }));

    // Return customer info and appointments
    return NextResponse.json({
      success: true,
      customer: {
        name: customer.name,
        phone: customer.phone,
        total_bookings: customer.total_bookings,
      },
      appointments: formattedAppointments,
    });
  } catch (error) {
    console.error("Guest appointment lookup error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to search appointments. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Method not allowed
 * Guest lookup requires POST for security (phone + name in body)
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Use POST to search appointments.",
    },
    { status: 405 }
  );
}

