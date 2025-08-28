import { PrismaClient } from "@prisma/client";

// NextAuth.js recommended pattern for Prisma client instantiation
// Prevents multiple instances during development hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton service for Prisma database client
 * Ensures single database connection throughout the application
 * Follows NextAuth.js best practices for development hot reloads
 */
export class PrismaService {
  private static instance: PrismaClient;

  /**
   * Get singleton Prisma client instance
   */
  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance =
        globalForPrisma.prisma ??
        new PrismaClient({
          log:
            process.env.NODE_ENV === "development"
              ? ["query", "error", "warn"]
              : ["error"],
        });

      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = PrismaService.instance;
      }
    }
    return PrismaService.instance;
  }

  /**
   * Disconnect Prisma client
   */
  static async disconnect(): Promise<void> {
    if (PrismaService.instance) {
      await PrismaService.instance.$disconnect();
    }
  }
}

// Export singleton instance for easy import
export const prisma = PrismaService.getInstance();
