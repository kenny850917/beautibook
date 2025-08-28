/**
 * BookingHoldService Tests
 * Tests the core 5-minute hold system functionality
 */

import { BookingHoldService } from "@/lib/services/BookingHoldService";
import {
  mockPrisma,
  mockDateNow,
  mockSetTimeout,
  createMockHold,
  createMockBooking,
} from "../setup";

describe("BookingHoldService", () => {
  let holdService: BookingHoldService;
  let timers: ReturnType<typeof mockSetTimeout>;

  beforeEach(() => {
    holdService = BookingHoldService.getInstance();
    timers = mockSetTimeout();
    mockDateNow(new Date("2024-12-20T09:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("createHold", () => {
    // Test that a booking slot can be held for 5 minutes with proper expiry timer
    it("should create a 5-minute hold successfully", async () => {
      const slotDateTime = new Date("2024-12-20T10:00:00Z");
      const expectedExpiry = new Date(Date.now() + 5 * 60 * 1000);

      // Mock availability check
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.findMany.mockResolvedValue([]);

      // Mock hold creation
      const mockHold = createMockHold({
        expires_at: expectedExpiry,
        slot_datetime: slotDateTime,
      });
      mockPrisma.bookingHold.create.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.create.mockResolvedValue({
        id: "analytics_123",
        session_id: "session_123",
        service_id: "service_123",
        staff_id: "staff_123",
        held_at: new Date(),
        expired_at: null,
        converted: false,
      });

      const result = await holdService.createHold(
        "session_123",
        "staff_123",
        "service_123",
        slotDateTime
      );

      expect(result).toEqual(mockHold);
      expect(mockPrisma.bookingHold.create).toHaveBeenCalledWith({
        data: {
          session_id: "session_123",
          staff_id: "staff_123",
          service_id: "service_123",
          slot_datetime: slotDateTime,
          expires_at: expectedExpiry,
        },
      });
    });

    // Test that hold creation fails when slot is already permanently booked
    it("should reject hold for already booked slot", async () => {
      const slotDateTime = new Date("2024-12-20T10:00:00Z");

      // Mock existing booking
      mockPrisma.booking.findUnique.mockResolvedValue(createMockBooking());

      await expect(
        holdService.createHold(
          "session_123",
          "staff_123",
          "service_123",
          slotDateTime
        )
      ).rejects.toThrow("Slot already booked");
    });

    // Test that hold creation fails when slot is already held by another session
    it("should reject hold for already held slot", async () => {
      const slotDateTime = new Date("2024-12-20T10:00:00Z");

      // Mock no existing booking but active hold
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(createMockHold());

      await expect(
        holdService.createHold(
          "session_123",
          "staff_123",
          "service_123",
          slotDateTime
        )
      ).rejects.toThrow("Slot currently held by another customer");
    });

    // Test that previous holds are released when creating a new hold for the same session
    it("should release existing holds for session before creating new one", async () => {
      const slotDateTime = new Date("2024-12-20T10:00:00Z");

      // Mock availability check passes
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);

      // Mock existing holds for session
      const existingHolds = [createMockHold({ id: "old_hold_1" })];
      mockPrisma.bookingHold.findMany.mockResolvedValue(existingHolds);
      mockPrisma.bookingHold.findUnique.mockResolvedValue(existingHolds[0]);
      mockPrisma.bookingHold.delete.mockResolvedValue(existingHolds[0]);

      // Mock new hold creation
      const newHold = createMockHold({ id: "new_hold" });
      mockPrisma.bookingHold.create.mockResolvedValue(newHold);
      mockPrisma.holdAnalytics.create.mockResolvedValue({
        id: "analytics_123",
        session_id: "session_123",
        service_id: "service_123",
        staff_id: "staff_123",
        held_at: new Date(),
        expired_at: null,
        converted: false,
      });

      await holdService.createHold(
        "session_123",
        "staff_123",
        "service_123",
        slotDateTime
      );

      // Should have deleted old hold
      expect(mockPrisma.bookingHold.delete).toHaveBeenCalledWith({
        where: { id: "old_hold_1" },
      });
    });
  });

  describe("automatic expiration", () => {
    // Test that holds automatically expire and are cleaned up after 5 minutes
    it("should clean up expired hold after 5 minutes", async () => {
      const slotDateTime = new Date("2024-12-20T10:00:00Z");

      // Mock successful hold creation
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.findMany.mockResolvedValue([]);

      const mockHold = createMockHold();
      mockPrisma.bookingHold.create.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.create.mockResolvedValue({
        id: "analytics_123",
        session_id: "session_123",
        service_id: "service_123",
        staff_id: "staff_123",
        held_at: new Date(),
        expired_at: null,
        converted: false,
      });

      await holdService.createHold(
        "session_123",
        "staff_123",
        "service_123",
        slotDateTime
      );

      // Fast forward 5 minutes
      mockPrisma.bookingHold.findUnique.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.bookingHold.delete.mockResolvedValue(mockHold);

      timers.advanceTime(5 * 60 * 1000);
      timers.runOnlyPendingTimers();

      // Should have marked analytics as expired and deleted hold
      expect(mockPrisma.holdAnalytics.updateMany).toHaveBeenCalledWith({
        where: {
          session_id: "session_123",
          converted: false,
        },
        data: {
          expired_at: expect.any(Date),
        },
      });

      expect(mockPrisma.bookingHold.delete).toHaveBeenCalledWith({
        where: { id: "hold_123" },
      });
    });
  });

  describe("releaseHold", () => {
    // Test that holds can be manually released before expiration
    it("should release hold manually", async () => {
      const mockHold = createMockHold();
      mockPrisma.bookingHold.findUnique.mockResolvedValue(mockHold);
      mockPrisma.bookingHold.delete.mockResolvedValue(mockHold);

      await holdService.releaseHold("hold_123");

      expect(mockPrisma.bookingHold.delete).toHaveBeenCalledWith({
        where: { id: "hold_123" },
      });
    });

    // Test that releasing a non-existent hold doesn't throw errors
    it("should handle non-existent hold gracefully", async () => {
      mockPrisma.bookingHold.findUnique.mockResolvedValue(null);

      await expect(
        holdService.releaseHold("nonexistent")
      ).resolves.not.toThrow();
      expect(mockPrisma.bookingHold.delete).not.toHaveBeenCalled();
    });
  });

  describe("convertHoldToBooking", () => {
    // Test that holds can be successfully converted to permanent bookings
    it("should convert hold and mark analytics as converted", async () => {
      const mockHold = createMockHold();
      mockPrisma.bookingHold.findUnique.mockResolvedValue(mockHold);
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.bookingHold.delete.mockResolvedValue(mockHold);

      await holdService.convertHoldToBooking("hold_123");

      expect(mockPrisma.holdAnalytics.updateMany).toHaveBeenCalledWith({
        where: {
          session_id: "session_123",
          service_id: "service_123",
          staff_id: "staff_123",
          converted: false,
        },
        data: {
          converted: true,
        },
      });

      expect(mockPrisma.bookingHold.delete).toHaveBeenCalledWith({
        where: { id: "hold_123" },
      });
    });

    // Test that converting a non-existent hold throws an appropriate error
    it("should throw error for non-existent hold", async () => {
      mockPrisma.bookingHold.findUnique.mockResolvedValue(null);

      await expect(
        holdService.convertHoldToBooking("nonexistent")
      ).rejects.toThrow("Hold not found");
    });
  });

  describe("getActiveHoldBySession", () => {
    // Test that active holds can be retrieved by session ID
    it("should return active hold for session", async () => {
      const activeHold = createMockHold({
        expires_at: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes remaining
      });

      mockPrisma.bookingHold.findFirst.mockResolvedValue(activeHold);

      const result = await holdService.getActiveHoldBySession("session_123");

      expect(result).toEqual(activeHold);
      expect(mockPrisma.bookingHold.findFirst).toHaveBeenCalledWith({
        where: {
          session_id: "session_123",
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

    // Test that null is returned when no active holds exist for a session
    it("should return null for no active holds", async () => {
      mockPrisma.bookingHold.findFirst.mockResolvedValue(null);

      const result = await holdService.getActiveHoldBySession("session_123");

      expect(result).toBeNull();
    });
  });

  describe("cleanupExpiredHolds", () => {
    // Test that batch cleanup removes all expired holds and updates analytics
    it("should clean up all expired holds", async () => {
      const now = new Date("2024-12-20T09:00:00Z");
      mockDateNow(now);

      const expiredHolds = [
        createMockHold({
          id: "expired_1",
          expires_at: new Date(now.getTime() - 1000),
        }),
        createMockHold({
          id: "expired_2",
          expires_at: new Date(now.getTime() - 2000),
        }),
      ];

      mockPrisma.bookingHold.findMany.mockResolvedValue(expiredHolds);
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.bookingHold.deleteMany.mockResolvedValue({ count: 2 });

      const result = await holdService.cleanupExpiredHolds();

      expect(result).toBe(2);
      expect(mockPrisma.bookingHold.deleteMany).toHaveBeenCalledWith({
        where: {
          expires_at: {
            lt: now,
          },
        },
      });
    });
  });

  describe("getHoldStatistics", () => {
    // Test that hold statistics are correctly aggregated for the specified date range
    it("should return hold statistics for date range", async () => {
      const startDate = new Date("2024-12-19T00:00:00Z");
      const endDate = new Date("2024-12-20T23:59:59Z");

      const mockAnalytics = [
        {
          id: "1",
          converted: true,
          expired_at: null,
          session_id: "session_1",
          service_id: "service_123",
          staff_id: "staff_123",
          held_at: new Date(),
        },
        {
          id: "2",
          converted: false,
          expired_at: new Date(),
          session_id: "session_2",
          service_id: "service_123",
          staff_id: "staff_123",
          held_at: new Date(),
        },
        {
          id: "3",
          converted: false,
          expired_at: null,
          session_id: "session_3",
          service_id: "service_123",
          staff_id: "staff_123",
          held_at: new Date(),
        },
      ];

      mockPrisma.holdAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await holdService.getHoldStatistics(startDate, endDate);

      expect(result).toEqual({
        totalHolds: 3,
        convertedHolds: 1,
        expiredHolds: 1,
        conversionRate: 33.33,
        analytics: mockAnalytics,
      });
    });
  });
});
