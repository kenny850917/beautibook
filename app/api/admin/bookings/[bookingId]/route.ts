/**
 * Admin Booking Management API
 * Allows admins to edit any booking
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for booking updates
const BookingUpdateSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z
    .string()
    .min(10, "Valid phone number is required")
    .max(20, "Phone number too long"),
  customerEmail: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().email().safeParse(val).success,
      {
        message: "Must be a valid email or empty",
      }
    )
    .transform((val) => (val === "" ? null : val || null)),
  price: z
    .number()
    .positive("Price must be positive")
    .or(
      z.string().transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) throw new Error("Price must be positive");
        return num;
      })
    ),
  status: z.enum(["CONFIRMED", "PENDING", "CANCELLED", "NOSHOW"]),
  notes: z
    .string()
    .optional()
    .transform((val) => (val === "" ? null : val || null)),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            photo_url: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration_minutes: true,
            base_price: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch booking details. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("[ADMIN API] Received booking update data:", body);
    console.log("[ADMIN API] Data types:", {
      customerName: typeof body.customerName,
      customerPhone: typeof body.customerPhone,
      customerEmail: typeof body.customerEmail,
      price: typeof body.price,
      status: typeof body.status,
      notes: typeof body.notes,
    });

    // Validate request body
    const validationResult = BookingUpdateSchema.safeParse(body);
    console.log("[ADMIN API] Validation result:", validationResult);
    console.log(
      "[ADMIN API] Parsed data after validation:",
      validationResult.success ? validationResult.data : "VALIDATION FAILED"
    );
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.issues);
      validationResult.error.issues.forEach((issue) => {
        console.error(
          `Field '${issue.path.join(".")}': ${issue.message}`,
          issue
        );
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { customerName, customerPhone, customerEmail, price, status, notes } =
      validationResult.data;

    const prisma = PrismaService.getInstance();

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration_minutes: true,
          },
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Update the booking
    console.log("[ADMIN API] About to update booking with data:", {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      final_price: price,
      status,
      notes: notes || null,
    });

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        final_price: price,
        status,
        notes: notes || null,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            photo_url: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration_minutes: true,
            base_price: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    console.log(
      "[ADMIN API] Database update successful. Updated booking:",
      updatedBooking
    );

    return NextResponse.json({
      success: true,
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update booking. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Delete the booking
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete booking. Please try again later.",
      },
      { status: 500 }
    );
  }
}
