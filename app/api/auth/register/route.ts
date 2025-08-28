import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { AuthService } from "@/lib/services/AuthService";

// Validation schema for registration
const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(UserRole),
  staffName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request data
    const validationResult = RegisterSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password, role, staffName } = validationResult.data;

    // Validate staff name for staff role
    if (role === UserRole.STAFF && (!staffName || !staffName.trim())) {
      return NextResponse.json(
        { error: "Staff name is required for staff accounts" },
        { status: 400 }
      );
    }

    // Get AuthService instance
    const authService = AuthService.getInstance();

    // Check if user already exists
    const existingUser = await authService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create new user with staff profile if needed
    const userData = {
      email: email.toLowerCase().trim(),
      password,
      role,
      ...(role === UserRole.STAFF &&
        staffName && {
          staffProfile: {
            name: staffName.trim(),
            bio: null,
            photo_url: null,
            services: [], // Empty array - admin will assign services
          },
        }),
    };

    const newUser = await authService.createUser(userData);

    // Return success response (don't include sensitive data)
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
