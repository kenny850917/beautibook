import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BookingWithCRMService } from "@/lib/services/BookingWithCRMService";

// Validation schema for customer lookup
const LookupSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.phone || data.email, {
    message: "Either phone or email must be provided",
  });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");

    // Validate input
    const validationResult = LookupSchema.safeParse({ phone, email });
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const bookingService = BookingWithCRMService.getInstance();

    // Look up customer by phone or email
    const lookupValue = phone || email!;
    const customerData = await bookingService.quickCustomerLookup(lookupValue);

    if (customerData) {
      return NextResponse.json({
        found: true,
        customer: {
          id: customerData.customer.id,
          name: customerData.customer.name,
          phone: customerData.customer.phone,
          email: customerData.customer.email,
          total_bookings: customerData.customer.total_bookings,
          total_spent: customerData.customer.total_spent,
          last_booking_at: customerData.customer.last_booking_at,
          preferred_staff: customerData.customer.preferred_staff,
          preferred_service: customerData.customer.preferred_service,
        },
        suggestions: customerData.suggestions,
      });
    } else {
      return NextResponse.json({
        found: false,
        message: "No customer found with this phone number or email",
      });
    }
  } catch (error) {
    console.error("Customer lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error while looking up customer" },
      { status: 500 }
    );
  }
}

// Search customers (for admin use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 20 } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // TODO: Add proper authentication check for admin routes
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== "ADMIN") {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const customerService = (
      await import("@/lib/services/CustomerService")
    ).CustomerService.getInstance();
    const customers = await customerService.searchCustomers(query.trim());

    return NextResponse.json({
      customers: customers.slice(0, limit),
      total: customers.length,
    });
  } catch (error) {
    console.error("Customer search error:", error);
    return NextResponse.json(
      { error: "Internal server error while searching customers" },
      { status: 500 }
    );
  }
}

