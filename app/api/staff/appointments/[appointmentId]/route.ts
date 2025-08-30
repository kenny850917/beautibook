/**
 * Staff Appointment Management API
 * Allows staff to edit their own appointments
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { PrismaService } from "@/lib/services/PrismaService";

// Validation schema for appointment updates
const AppointmentUpdateSchema = z.object({
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;

    // Check authentication and staff role
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Staff access required" },
        { status: 403 }
      );
    }

    if (!session.user.staffId) {
      return NextResponse.json(
        { error: "Staff ID not found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("[STAFF API] Received appointment update data:", body);
    console.log("[STAFF API] Data types:", {
      customerName: typeof body.customerName,
      customerPhone: typeof body.customerPhone,
      customerEmail: typeof body.customerEmail,
      price: typeof body.price,
      status: typeof body.status,
      notes: typeof body.notes,
    });

    // Validate request body
    const validationResult = AppointmentUpdateSchema.safeParse(body);
    console.log("[STAFF API] Validation result:", validationResult);
    console.log(
      "[STAFF API] Parsed data after validation:",
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

    // Check if appointment exists and belongs to the current staff member
    const existingAppointment = await prisma.booking.findFirst({
      where: {
        id: appointmentId,
        staff_id: session.user.staffId,
      },
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

    if (!existingAppointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found or access denied" },
        { status: 404 }
      );
    }

    // Update the appointment
    console.log("[STAFF API] About to update appointment with data:", {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      final_price: price,
      status,
      notes: notes || null,
    });

    const updatedAppointment = await prisma.booking.update({
      where: { id: appointmentId },
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

    console.log(
      "[STAFF API] Database update successful. Updated appointment:",
      updatedAppointment
    );

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update appointment. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;

    // Check authentication and staff role
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Staff access required" },
        { status: 403 }
      );
    }

    if (!session.user.staffId) {
      return NextResponse.json(
        { error: "Staff ID not found" },
        { status: 403 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Check if appointment exists and belongs to the current staff member
    const existingAppointment = await prisma.booking.findFirst({
      where: {
        id: appointmentId,
        staff_id: session.user.staffId,
      },
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the appointment
    await prisma.booking.delete({
      where: { id: appointmentId },
    });

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete appointment. Please try again later.",
      },
      { status: 500 }
    );
  }
}
