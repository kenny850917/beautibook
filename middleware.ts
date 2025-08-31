import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Protect admin routes - Admin role only
    if (pathname.startsWith("/admin")) {
      if (!token || token.role !== "ADMIN") {
        return NextResponse.redirect(
          new URL("/auth/signin?error=AdminRequired", req.url)
        );
      }
    }

    // Protect staff routes - Staff or Admin roles
    if (pathname.startsWith("/staff")) {
      if (!token || (token.role !== "STAFF" && token.role !== "ADMIN")) {
        return NextResponse.redirect(
          new URL("/auth/signin?error=StaffRequired", req.url)
        );
      }
    }

    // API route protection
    if (pathname.startsWith("/api/admin")) {
      if (!token || token.role !== "ADMIN") {
        return new NextResponse(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }

    // Customer API protection - Admin only access
    if (pathname.startsWith("/api/customers")) {
      if (!token || token.role !== "ADMIN") {
        return new NextResponse(
          JSON.stringify({
            error: "Admin access required for customer management",
          }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }

    // Staff API - All public for booking flow
    // No protection needed - all /api/staff routes are public

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow all public routes including staff API for booking
        if (
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/booking") ||
          pathname.startsWith("/api/services") ||
          pathname.startsWith("/api/availability") ||
          pathname.startsWith("/api/holds") ||
          pathname.startsWith("/api/bookings") ||
          pathname.startsWith("/api/staff") ||
          pathname === "/" ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/public")
        ) {
          return true;
        }

        // Protected routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Protected routes
    "/admin/:path*",
    "/staff/:path*",
    "/api/admin/:path*",
    "/api/customers/:path*",
    // Public routes that need auth checking
    "/dashboard/:path*",
    // Note: /api/staff/* excluded - all public for booking
  ],
};
