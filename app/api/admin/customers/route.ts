import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { CustomerService } from "@/lib/services/CustomerService";

// Validation schema for customer query parameters
const CustomerQuerySchema = z.object({
  search: z
    .string()
    .nullish()
    .transform((val) => val ?? ""),
  filter: z
    .enum(["all", "vip", "gold", "regular", "new", "inactive"])
    .nullish()
    .transform((val) => val ?? "all"),
  limit: z
    .string()
    .nullish()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  offset: z
    .string()
    .nullish()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
});

/**
 * GET - Fetch customers with filtering and search
 * Admin-only endpoint for customer CRM dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      search: searchParams.get("search"),
      filter: searchParams.get("filter"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    };

    // Validate query parameters
    const validationResult = CustomerQuerySchema.safeParse(query);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { search, filter, limit, offset } = validationResult.data;

    // Use CustomerService singleton
    const customerService = CustomerService.getInstance();

    // Get customers with filtering
    const customers = await customerService.getCustomersWithFiltering({
      search,
      filter,
      limit,
      offset,
    });

    // Calculate customer segments for each customer
    const customersWithSegments = customers.map((customer) => {
      const segment = getCustomerSegment(customer);
      return {
        ...customer,
        segment,
      };
    });

    // Get total count for pagination
    const totalCount = await customerService.getCustomerCount({
      search,
      filter,
    });

    // Calculate summary statistics
    const stats = {
      total: totalCount,
      vip: customersWithSegments.filter((c) => c.segment === "VIP").length,
      gold: customersWithSegments.filter((c) => c.segment === "Gold").length,
      regular: customersWithSegments.filter((c) => c.segment === "Regular")
        .length,
      new: customersWithSegments.filter((c) => c.segment === "New").length,
      totalRevenue: customersWithSegments.reduce(
        (sum, c) => sum + c.total_spent,
        0
      ),
      avgBookings:
        totalCount > 0
          ? customersWithSegments.reduce(
              (sum, c) => sum + c.total_bookings,
              0
            ) / totalCount
          : 0,
      emailConsent: customersWithSegments.filter((c) => c.marketing_consent)
        .length,
    };

    return NextResponse.json({
      success: true,
      customers: customersWithSegments,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      stats,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch customers",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Customer segmentation logic following MVP.md requirements
 */
function getCustomerSegment(customer: {
  total_spent: number;
  total_bookings: number;
  created_at: Date;
}): "VIP" | "Gold" | "Regular" | "New" {
  // VIP: $1000+ total spent
  if (customer.total_spent >= 100000) {
    // $1000 in cents
    return "VIP";
  }

  // Gold: $500+ total spent
  if (customer.total_spent >= 50000) {
    // $500 in cents
    return "Gold";
  }

  // Regular: 5+ bookings
  if (customer.total_bookings >= 5) {
    return "Regular";
  }

  // New: everyone else
  return "New";
}
