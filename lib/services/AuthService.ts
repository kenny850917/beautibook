import { User, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaService } from "./PrismaService";

interface CreateUserData {
  email: string;
  password: string;
  role: UserRole;
  staffProfile?: {
    name: string;
    bio: string | null;
    photo_url: string | null;
    services: string[];
  };
}

/**
 * Singleton service for authentication and user management
 * Handles password hashing, user creation, and role-based authorization
 */
export class AuthService {
  private static instance: AuthService;
  private prisma = PrismaService.getInstance();

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Hash password with bcrypt (12 salt rounds)
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Create new user with hashed password and optional staff profile
   */
  async createUser(data: CreateUserData): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);

    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          password_hash: hashedPassword,
          role: data.role,
        },
      });

      // Create staff profile if provided
      if (data.staffProfile && data.role === UserRole.STAFF) {
        await tx.staff.create({
          data: {
            user_id: user.id,
            name: data.staffProfile.name,
            bio: data.staffProfile.bio,
            photo_url: data.staffProfile.photo_url,
            services: data.staffProfile.services,
          },
        });
      }

      return user;
    });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        staff: true,
      },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        staff: true,
      },
    });
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedPassword,
      },
    });
  }

  /**
   * Check if user has admin role
   */
  isAdmin(user: User): boolean {
    return user.role === UserRole.ADMIN;
  }

  /**
   * Check if user has staff role (or admin)
   */
  isStaff(user: User): boolean {
    return user.role === UserRole.STAFF || user.role === UserRole.ADMIN;
  }

  /**
   * Check if user can access admin features
   */
  canAccessAdmin(user: User): boolean {
    return this.isAdmin(user);
  }

  /**
   * Check if user can access staff features
   */
  canAccessStaff(user: User): boolean {
    return this.isStaff(user);
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength (basic requirements)
   */
  isValidPassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 6) {
      return {
        valid: false,
        message: "Password must be at least 6 characters long",
      };
    }

    // For MVP, keep it simple - just length requirement
    return { valid: true };
  }

  /**
   * Get all staff users (for admin management)
   */
  async getAllStaff(): Promise<User[]> {
    return await this.prisma.user.findMany({
      where: {
        role: UserRole.STAFF,
      },
      include: {
        staff: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  }

  /**
   * Delete user (for admin management)
   */
  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
