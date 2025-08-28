/**
 * Basic BookingHoldService Tests
 * Focus on core singleton and mock validation only - following backend.mdc MVP principles
 */

import { BookingHoldService } from "@/lib/services/BookingHoldService";
import { mockPrisma, createMockHold } from "../setup";

describe("BookingHoldService - Core Functionality", () => {
  let holdService: BookingHoldService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    holdService = BookingHoldService.getInstance();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = BookingHoldService.getInstance();
      const instance2 = BookingHoldService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("convertHoldToBooking", () => {
    it("should convert hold to booking successfully", async () => {
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
        data: { converted: true },
      });

      expect(mockPrisma.bookingHold.delete).toHaveBeenCalledWith({
        where: { id: "hold_123" },
      });
    });

    it("should handle missing hold gracefully", async () => {
      mockPrisma.bookingHold.findUnique.mockResolvedValue(null);

      await expect(
        holdService.convertHoldToBooking("missing_hold")
      ).rejects.toThrow("Hold not found");
    });
  });

  describe("cleanupExpiredHolds", () => {
    it("should handle cleanup errors gracefully", async () => {
      mockPrisma.bookingHold.findMany.mockRejectedValue(
        new Error("Database error")
      );

      // Should not throw - cleanup errors shouldn't break core functionality
      await expect(holdService.cleanupExpiredHolds()).resolves.not.toThrow();
    });
  });
});
