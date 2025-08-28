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

    if (pathname.startsWith("/api/staff")) {
      if (!token || (token.role !== "STAFF" && token.role !== "ADMIN")) {
        return new NextResponse(
          JSON.stringify({ error: "Staff access required" }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow public routes
        if (
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/booking") ||
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
    "/api/staff/:path*",
    // Public routes that need auth checking
    "/dashboard/:path*",
  ],
};

