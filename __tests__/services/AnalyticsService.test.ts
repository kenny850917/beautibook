/**
 * Basic AnalyticsService Tests
 * Focus on core tracking functionality only - following backend.mdc MVP principles
 */

import { AnalyticsService } from "@/lib/services/AnalyticsService";
import { mockPrisma } from "../setup";

describe("AnalyticsService - Core Functionality", () => {
  let analyticsService: AnalyticsService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    analyticsService = AnalyticsService.getInstance();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = AnalyticsService.getInstance();
      const instance2 = AnalyticsService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Hold Creation Tracking", () => {
    it("should track hold creation successfully", async () => {
      const holdData = {
        sessionId: "session_123",
        staffId: "staff_123",
        serviceId: "service_123",
      };

      mockPrisma.holdAnalytics.create.mockResolvedValue({
        id: "analytics_123",
        session_id: "session_123",
        service_id: "service_123",
        staff_id: "staff_123",
        held_at: new Date(),
        expired_at: null,
        converted: false,
      });

      await analyticsService.trackHoldCreation(holdData);

      expect(mockPrisma.holdAnalytics.create).toHaveBeenCalledWith({
        data: {
          session_id: "session_123",
          service_id: "service_123",
          staff_id: "staff_123",
          held_at: expect.any(Date),
          expired_at: null,
          converted: false,
        },
      });
    });

    it("should handle database errors gracefully", async () => {
      const holdData = {
        sessionId: "session_123",
        staffId: "staff_123",
        serviceId: "service_123",
      };

      mockPrisma.holdAnalytics.create.mockRejectedValue(
        new Error("Database error")
      );

      // Should not throw - analytics failures shouldn't break core functionality
      await expect(
        analyticsService.trackHoldCreation(holdData)
      ).resolves.not.toThrow();
    });
  });

  describe("Hold Conversion Tracking", () => {
    it("should track hold conversion successfully", async () => {
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });

      await analyticsService.trackHoldConversion(
        "session_123",
        "staff_123",
        "service_123"
      );

      expect(mockPrisma.holdAnalytics.updateMany).toHaveBeenCalledWith({
        where: {
          session_id: "session_123",
          staff_id: "staff_123",
          service_id: "service_123",
          converted: false,
        },
        data: {
          converted: true,
        },
      });
    });

    it("should handle conversion errors gracefully", async () => {
      mockPrisma.holdAnalytics.updateMany.mockRejectedValue(
        new Error("Database error")
      );

      // Should not throw - analytics failures shouldn't break core functionality
      await expect(
        analyticsService.trackHoldConversion(
          "session_123",
          "staff_123",
          "service_123"
        )
      ).resolves.not.toThrow();
    });
  });
});
