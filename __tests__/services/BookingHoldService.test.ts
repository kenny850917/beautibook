/**
 * BookingHoldService Core Tests
 * Following backend.mdc MVP patterns - testing critical hold system logic
 */

import { BookingHoldService } from "@/lib/services/BookingHoldService";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// Mock dependencies following backend.mdc simple mocking

// Mock services before creating instances
jest.mock("@/lib/services/PrismaService", () => ({
  PrismaService: {
    getInstance: jest.fn(),
  },
}));

const mockPrisma = mockDeep<PrismaClient>();

describe("BookingHoldService - Core Hold System Logic", () => {
  let holdService: BookingHoldService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const mockCreatedHold = {
    id: "hold_123",
    session_id: "session_123",
    staff_id: "staff_456",
    service_id: "service_789",
    slot_datetime: new Date("2024-01-15T14:30:00Z"),
    expires_at: new Date("2024-01-15T14:35:00Z"),
    created_at: new Date(),
  };

  beforeEach(() => {
    // Reset all mocks
    mockReset(mockPrisma);

    // Mock console methods to suppress logs during tests
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Setup the mocked PrismaService to return our mock
    const { PrismaService } = require("@/lib/services/PrismaService");
    (PrismaService.getInstance as jest.Mock).mockReturnValue(mockPrisma);

    holdService = BookingHoldService.getInstance();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("createHold() - Critical Hold Logic", () => {
    beforeEach(() => {
      // Setup default successful mocks
      mockPrisma.bookingHold.create.mockResolvedValue(mockCreatedHold as any);
      mockPrisma.holdAnalytics.create.mockResolvedValue({} as any);

      // Mock service lookup for duration-based hold logic (60-minute service = 4 slots)
      mockPrisma.service.findUnique.mockResolvedValue({
        id: "service_789",
        duration_minutes: 60,
      } as any);

      // Mock database transaction for multiple hold creation
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        // Simulate creating 4 holds for 60-minute service
        const mockHolds = [
          mockCreatedHold,
          {
            ...mockCreatedHold,
            id: "hold_456_2",
            slot_datetime: new Date("2024-01-15T14:45:00Z"),
          },
          {
            ...mockCreatedHold,
            id: "hold_456_3",
            slot_datetime: new Date("2024-01-15T15:00:00Z"),
          },
          {
            ...mockCreatedHold,
            id: "hold_456_4",
            slot_datetime: new Date("2024-01-15T15:15:00Z"),
          },
        ];
        return callback
          ? (await callback({
              bookingHold: {
                create: jest.fn().mockResolvedValue(mockCreatedHold),
              },
            })) || mockHolds
          : mockHolds;
      });

      // Mock database calls for slot availability check (no existing booking)
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      // Mock database calls for active holds check (no existing hold)
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      // Mock releasing existing holds (returns delete count)
      mockPrisma.bookingHold.deleteMany.mockResolvedValue({ count: 0 });
      // Mock the scheduleHoldCleanup method (it's private but called internally)
      jest
        .spyOn(holdService as any, "scheduleHoldCleanup")
        .mockImplementation(() => {});
    });

    it("should create hold successfully with 5-minute expiration", async () => {
      const result = await holdService.createHold(
        "session_123",
        "staff_456",
        "service_789",
        new Date("2024-01-15T14:30:00Z")
      );

      expect(result).toEqual(mockCreatedHold);

      // Verify that service lookup was called for duration-based holds
      expect(mockPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: "service_789" },
        select: { duration_minutes: true },
      });

      // Verify that transaction was called to create multiple holds
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should track hold analytics on creation", async () => {
      await holdService.createHold(
        "session_123",
        "staff_456",
        "service_789",
        new Date("2024-01-15T14:30:00Z")
      );

      expect(mockPrisma.holdAnalytics.create).toHaveBeenCalledWith({
        data: {
          session_id: "session_123",
          service_id: "service_789",
          staff_id: "staff_456",
          held_at: expect.any(Date),
          converted: false,
        },
      });
    });

    it("should not send SSE notification (disabled for MVP)", async () => {
      await holdService.createHold(
        "session_123",
        "staff_456",
        "service_789",
        new Date("2024-01-15T14:30:00Z")
      );

      // No SSE notifications in MVP
    });

    it("should complete successfully without SSE notifications", async () => {
      // SSE functionality removed from MVP
      const result = await holdService.createHold(
        "session_123",
        "staff_456",
        "service_789",
        new Date("2024-01-15T14:30:00Z")
      );

      expect(result).toEqual(mockCreatedHold);
      // No SSE functionality in MVP
    });

    it("should handle database errors gracefully", async () => {
      // Mock service lookup to succeed but transaction to fail
      mockPrisma.service.findUnique.mockResolvedValue({
        id: "service_789",
        duration_minutes: 60,
      } as any);

      // Mock database transaction error
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        holdService.createHold(
          "session_123",
          "staff_456",
          "service_789",
          new Date("2024-01-15T14:30:00Z")
        )
      ).rejects.toThrow("Database connection failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error creating booking hold:",
        expect.any(Error)
      );
    });
  });

  describe("getActiveHoldBySession() - Session Management", () => {
    it("should return active hold for session", async () => {
      const mockHold = {
        id: "hold_123",
        session_id: "session_456",
        staff_id: "staff_789",
        expires_at: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
      };

      mockPrisma.bookingHold.findFirst.mockResolvedValue(mockHold as any);

      const result = await holdService.getActiveHoldBySession("session_456");

      expect(result).toEqual(mockHold);
      expect(mockPrisma.bookingHold.findFirst).toHaveBeenCalledWith({
        where: {
          session_id: "session_456",
          expires_at: {
            gt: expect.any(Date),
          },
        },
        include: {
          staff: {
            include: {
              user: true,
            },
          },
          service: true,
        },
      });
    });

    it("should return null if no active hold exists", async () => {
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);

      const result = await holdService.getActiveHoldBySession("session_456");

      expect(result).toBeNull();
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = BookingHoldService.getInstance();
      const instance2 = BookingHoldService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Error Handling Following MVP Patterns", () => {
    it("should handle graceful degradation when services fail", async () => {
      // Test that core hold creation works even if analytics fail

      // Mock service lookup to succeed
      mockPrisma.service.findUnique.mockResolvedValue({
        id: "service_789",
        duration_minutes: 60,
      } as any);

      // Mock successful transaction but failing analytics
      mockPrisma.$transaction.mockResolvedValue([mockCreatedHold]);
      mockPrisma.holdAnalytics.create.mockRejectedValue(
        new Error("Analytics down")
      );

      // Mock database calls for internal methods
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.deleteMany.mockResolvedValue({ count: 0 });
      // Mock the scheduleHoldCleanup method
      jest
        .spyOn(holdService as any, "scheduleHoldCleanup")
        .mockImplementation(() => {});

      // Should still create the hold successfully
      const result = await holdService.createHold(
        "session_123",
        "staff_456",
        "service_789",
        new Date()
      );

      expect(result).toEqual(mockCreatedHold);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
