import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CustomerService } from "@/lib/services/CustomerService";

// Validation schemas following backend.mdc Zod validation
const CustomerLookupSchema = z.object({
  query: z.string().min(1, "Query is required"),
  type: z.enum(["phone", "email"]).optional(),
});

const CustomerSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().min(1).max(20).optional().default(10),
});

/**
 * GET - Customer lookup by phone or email
 * Used by CustomerLookupForm for real-time customer recognition
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const type = searchParams.get("type");

    // Validate input following backend.mdc patterns
    const validationResult = CustomerLookupSchema.safeParse({
      query,
      type,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { query: searchQuery, type: searchType } = validationResult.data;

    // Use singleton CustomerService following backend.mdc
    const customerService = CustomerService.getInstance();
    let customer = null;

    // Smart lookup logic - try phone first, then email
    if (searchType === "phone" || !searchType) {
      customer = await customerService.findCustomerByPhone(searchQuery);
    }

    if (!customer && (searchType === "email" || !searchType)) {
      if (searchQuery.includes("@")) {
        customer = await customerService.findCustomerByEmail(searchQuery);
      }
    }

    if (customer) {
      // Get customer with booking history for personalized suggestions
      const customerWithHistory = await customerService.getCustomerWithHistory(
        customer.id
      );

      return NextResponse.json({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          total_bookings: customer.total_bookings,
          total_spent: customer.total_spent,
          last_booking_at: customer.last_booking_at,
          preferred_staff: customer.preferred_staff,
          preferred_service: customer.preferred_service,
          marketing_consent: customer.marketing_consent,
        },
        suggestions: {
          isReturning: customer.total_bookings > 0,
          preferredStaff: customer.preferred_staff,
          preferredService: customer.preferred_service,
          totalVisits: customer.total_bookings,
          lastVisit: customer.last_booking_at,
        },
        recentBookings: customerWithHistory?.bookings?.slice(0, 3) || [],
      });
    }

    // Customer not found - return empty result for new customer
    return NextResponse.json({
      success: true,
      customer: null,
      suggestions: {
        isReturning: false,
      },
    });
  } catch (error) {
    console.error("Customer lookup error:", error);

    // Simple error handling following backend.mdc
    return NextResponse.json(
      {
        error: "Failed to lookup customer",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Customer search for admin interface
 * Used by CustomerCRMContent for admin customer management
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod following backend.mdc
    const validationResult = CustomerSearchSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { query, limit } = validationResult.data;

    // Use singleton CustomerService
    const customerService = CustomerService.getInstance();

    // Search customers by name, phone, or email
    const customers = await customerService.searchCustomers(query);

    // Limit results for performance
    const limitedResults = customers.slice(0, limit);

    return NextResponse.json({
      success: true,
      customers: limitedResults.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        total_bookings: customer.total_bookings,
        total_spent: customer.total_spent,
        last_booking_at: customer.last_booking_at,
        preferred_staff: customer.preferred_staff,
        preferred_service: customer.preferred_service,
        marketing_consent: customer.marketing_consent,
        created_at: customer.created_at,
      })),
      count: limitedResults.length,
      total: customers.length,
    });
  } catch (error) {
    console.error("Customer search error:", error);

    // Simple error handling following backend.mdc
    return NextResponse.json(
      {
        error: "Failed to search customers",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
