/**
 * Integration Tests - End-to-End Booking Hold Flow
 * Tests the complete hold system from creation to conversion/expiration
 */

import { BookingHoldService } from "@/lib/services/BookingHoldService";
import { AnalyticsService } from "@/lib/services/AnalyticsService";
import { BookingService } from "@/lib/services/BookingService";
import {
  mockPrisma,
  mockDateNow,
  mockSetTimeout,
  createMockHold,
  createMockStaff,
  createMockService,
  createMockBooking,
} from "../setup";

// Mock the availability service
jest.mock("@/lib/services/AvailabilityService", () => ({
  AvailabilityService: {
    getInstance: () => ({
      isStaffAvailable: jest.fn().mockResolvedValue(true),
    }),
  },
}));

describe("Booking Hold Flow Integration", () => {
  let holdService: BookingHoldService;
  let analyticsService: AnalyticsService;
  let bookingService: BookingService;
  let timers: ReturnType<typeof mockSetTimeout>;

  // Common test data
  const slotDateTime = new Date("2024-12-20T10:00:00Z");

  beforeEach(() => {
    holdService = BookingHoldService.getInstance();
    analyticsService = AnalyticsService.getInstance();
    bookingService = BookingService.getInstance();
    timers = mockSetTimeout();
    mockDateNow(new Date("2024-12-20T09:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Complete Hold-to-Booking Flow", () => {
    const sessionId = "session_123";
    const staffId = "staff_123";
    const serviceId = "service_123";

    beforeEach(() => {
      // Mock basic data
      mockPrisma.staff.findUnique.mockResolvedValue(
        createMockStaff({
          id: staffId,
          services: [serviceId],
        })
      );

      mockPrisma.service.findUnique.mockResolvedValue(
        createMockService({
          id: serviceId,
          duration_minutes: 60,
          base_price: 6500,
        })
      );

      mockPrisma.staffServicePricing.findFirst.mockResolvedValue(null);
    });

    it("should complete full flow: create hold → convert to booking → track analytics", async () => {
      // Step 1: Create Hold
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.findMany.mockResolvedValue([]);

      const mockHold = createMockHold({
        id: "hold_123",
        session_id: sessionId,
        staff_id: staffId,
        service_id: serviceId,
        slot_datetime: slotDateTime,
      });

      mockPrisma.bookingHold.create.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.create.mockResolvedValue({} as any);

      const hold = await holdService.createHold(
        sessionId,
        staffId,
        serviceId,
        slotDateTime
      );

      expect(hold).toEqual(mockHold);
      expect(mockPrisma.holdAnalytics.create).toHaveBeenCalledWith({
        data: {
          session_id: sessionId,
          service_id: serviceId,
          staff_id: staffId,
          held_at: expect.any(Date),
          converted: false,
        },
      });

      // Step 2: Convert Hold to Booking
      mockPrisma.bookingHold.findUnique.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.bookingHold.delete.mockResolvedValue(mockHold);

      // Mock booking creation
      const mockBooking = createMockBooking({
        staff_id: staffId,
        service_id: serviceId,
        slot_datetime: slotDateTime,
      });

      mockPrisma.booking.findFirst.mockResolvedValue(null); // No conflicts
      mockPrisma.booking.findMany.mockResolvedValue([]); // No overlaps
      mockPrisma.bookingHold.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.create.mockResolvedValue(mockBooking);

      const booking = await bookingService.createBooking(
        staffId,
        serviceId,
        slotDateTime,
        "John Doe",
        "+1234567890",
        sessionId
      );

      expect(booking).toEqual(mockBooking);

      // Verify hold was converted in analytics
      expect(mockPrisma.holdAnalytics.updateMany).toHaveBeenCalledWith({
        where: {
          session_id: sessionId,
          staff_id: staffId,
          service_id: serviceId,
          converted: false,
        },
        data: {
          converted: true,
        },
      });

      // Verify hold was deleted
      expect(mockPrisma.bookingHold.deleteMany).toHaveBeenCalledWith({
        where: {
          session_id: sessionId,
          staff_id: staffId,
          service_id: serviceId,
          slot_datetime: slotDateTime,
        },
      });
    });

    it("should handle hold expiration flow correctly", async () => {
      // Create hold
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.findMany.mockResolvedValue([]);

      const mockHold = createMockHold({
        session_id: sessionId,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      mockPrisma.bookingHold.create.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.create.mockResolvedValue({} as any);

      await holdService.createHold(sessionId, staffId, serviceId, slotDateTime);

      // Fast-forward to expiration
      mockPrisma.bookingHold.findUnique.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.bookingHold.delete.mockResolvedValue(mockHold);

      timers.advanceTime(5 * 60 * 1000); // 5 minutes
      timers.runOnlyPendingTimers();

      // Verify expiration handling
      expect(mockPrisma.holdAnalytics.updateMany).toHaveBeenCalledWith({
        where: {
          session_id: sessionId,
          converted: false,
        },
        data: {
          expired_at: expect.any(Date),
        },
      });

      expect(mockPrisma.bookingHold.delete).toHaveBeenCalledWith({
        where: { id: mockHold.id },
      });
    });

    it("should prevent double booking conflicts", async () => {
      // First booking succeeds
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.findMany.mockResolvedValue([]);

      const hold1 = createMockHold({ id: "hold_1", session_id: "session_1" });
      mockPrisma.bookingHold.create.mockResolvedValue(hold1);
      mockPrisma.holdAnalytics.create.mockResolvedValue({} as any);

      await holdService.createHold(
        "session_1",
        staffId,
        serviceId,
        slotDateTime
      );

      // Second hold attempt should fail due to existing hold
      const existingHold = createMockHold({
        staff_id: staffId,
        slot_datetime: slotDateTime,
        expires_at: new Date(Date.now() + 3 * 60 * 1000),
      });

      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(existingHold);

      await expect(
        holdService.createHold("session_2", staffId, serviceId, slotDateTime)
      ).rejects.toThrow("Slot currently held by another customer");
    });

    it("should handle session hold replacement", async () => {
      // Create first hold for session
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);

      const oldHold = createMockHold({ id: "old_hold" });
      mockPrisma.bookingHold.findMany.mockResolvedValue([oldHold]);
      mockPrisma.bookingHold.findUnique.mockResolvedValue(oldHold);
      mockPrisma.bookingHold.delete.mockResolvedValue(oldHold);

      const newHold = createMockHold({ id: "new_hold" });
      mockPrisma.bookingHold.create.mockResolvedValue(newHold);
      mockPrisma.holdAnalytics.create.mockResolvedValue({} as any);

      // Create new hold (should replace old one)
      const result = await holdService.createHold(
        sessionId,
        "different_staff",
        serviceId,
        new Date("2024-12-20T11:00:00Z")
      );

      // Should have released old hold
      expect(mockPrisma.bookingHold.delete).toHaveBeenCalledWith({
        where: { id: "old_hold" },
      });

      // Should have created new hold
      expect(result.id).toBe("new_hold");
    });
  });

  describe("Analytics Integration", () => {
    it("should track complete hold lifecycle analytics", async () => {
      const startDate = new Date("2024-12-19T00:00:00Z");
      const endDate = new Date("2024-12-20T23:59:59Z");

      // Mock analytics data for a complete flow
      const mockAnalytics = [
        {
          id: "1",
          session_id: "session_1",
          staff_id: "staff_123",
          service_id: "service_123",
          held_at: new Date("2024-12-20T09:00:00Z"),
          expired_at: null,
          converted: true,
        },
        {
          id: "2",
          session_id: "session_2",
          staff_id: "staff_123",
          service_id: "service_123",
          held_at: new Date("2024-12-20T10:00:00Z"),
          expired_at: new Date("2024-12-20T10:05:00Z"),
          converted: false,
        },
      ];

      // Mock parallel data fetching
      mockPrisma.holdAnalytics.findMany.mockResolvedValue(mockAnalytics as any);
      mockPrisma.booking.aggregate.mockResolvedValue({
        _count: 1,
        _sum: { final_price: 6500 },
      } as any);
      (mockPrisma.booking.groupBy as any).mockResolvedValue([]);
      mockPrisma.service.findMany.mockResolvedValue([]);
      mockPrisma.staff.findMany.mockResolvedValue([]);
      mockPrisma.booking.findMany.mockResolvedValue([]);
      (mockPrisma.holdAnalytics.groupBy as any).mockResolvedValue([]);

      const insights = await analyticsService.getAnalyticsInsights({
        startDate,
        endDate,
      });

      expect(insights.totalHolds).toBe(2);
      expect(insights.convertedHolds).toBe(1);
      expect(insights.expiredHolds).toBe(1);
      expect(insights.conversionRate).toBe(50);
    });

    it("should track conversion funnel correctly", async () => {
      const startDate = new Date("2024-12-19T00:00:00Z");
      const endDate = new Date("2024-12-20T23:59:59Z");

      const mockHolds = [
        { converted: true, expired_at: null }, // Converted
        { converted: false, expired_at: new Date() }, // Expired
        { converted: false, expired_at: null }, // Abandoned
        { converted: true, expired_at: null }, // Converted
      ];

      mockPrisma.holdAnalytics.findMany.mockResolvedValue(mockHolds as any);

      const funnel = await analyticsService.getConversionFunnel({
        startDate,
        endDate,
      });

      expect(funnel).toEqual({
        totalHolds: 4,
        converted: 2,
        expired: 1,
        abandoned: 1,
        conversionRate: 50,
        abandonmentRate: 25,
        expirationRate: 25,
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle database transaction failures gracefully", async () => {
      mockPrisma.booking.findUnique.mockRejectedValue(
        new Error("Database connection lost")
      );

      await expect(
        holdService.createHold(
          "session_123",
          "staff_123",
          "service_123",
          slotDateTime
        )
      ).rejects.toThrow("Database connection lost");

      // Should not have created analytics record if hold creation failed
      expect(mockPrisma.holdAnalytics.create).not.toHaveBeenCalled();
    });

    it("should continue hold operations even if analytics fail", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.findMany.mockResolvedValue([]);

      const mockHold = createMockHold();
      mockPrisma.bookingHold.create.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.create.mockRejectedValue(
        new Error("Analytics service down")
      );

      // Should still create hold even if analytics fail
      const result = await holdService.createHold(
        "session_123",
        "staff_123",
        "service_123",
        slotDateTime
      );

      expect(result).toEqual(mockHold);
    });

    it("should handle hold cleanup on server restart", async () => {
      const now = new Date("2024-12-20T09:00:00Z");
      mockDateNow(now);

      const expiredHolds = [
        createMockHold({
          id: "expired_1",
          expires_at: new Date(now.getTime() - 60000), // 1 minute ago
        }),
        createMockHold({
          id: "expired_2",
          expires_at: new Date(now.getTime() - 120000), // 2 minutes ago
        }),
      ];

      mockPrisma.bookingHold.findMany.mockResolvedValue(expiredHolds);
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.bookingHold.deleteMany.mockResolvedValue({ count: 2 });

      const cleanedCount = await holdService.cleanupExpiredHolds();

      expect(cleanedCount).toBe(2);
      expect(mockPrisma.bookingHold.deleteMany).toHaveBeenCalledWith({
        where: {
          expires_at: {
            lt: now,
          },
        },
      });
    });
  });
});
