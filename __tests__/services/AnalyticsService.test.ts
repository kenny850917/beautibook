/**
 * AnalyticsService Tests
 * Tests hold conversion tracking and business analytics
 */

import { AnalyticsService } from "@/lib/services/AnalyticsService";
import { mockPrisma, mockDateNow } from "../setup";

describe("AnalyticsService", () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = AnalyticsService.getInstance();
    mockDateNow(new Date("2024-12-20T09:00:00Z"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("trackHoldCreation", () => {
    // Test that hold creation analytics are properly logged to the database
    it("should track hold creation event", async () => {
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

    // Test that analytics failures don't break core functionality (graceful degradation)
    it("should not throw if analytics tracking fails", async () => {
      const holdData = {
        sessionId: "session_123",
        staffId: "staff_123",
        serviceId: "service_123",
      };

      mockPrisma.holdAnalytics.create.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        analyticsService.trackHoldCreation(holdData)
      ).resolves.not.toThrow();
    });
  });

  describe("trackHoldExpiration", () => {
    // Test that expired holds are properly marked with expiration timestamp
    it("should mark hold analytics as expired", async () => {
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({ count: 1 });

      await analyticsService.trackHoldExpiration("session_123");

      expect(mockPrisma.holdAnalytics.updateMany).toHaveBeenCalledWith({
        where: {
          session_id: "session_123",
          expired_at: null,
          converted: false,
        },
        data: {
          expired_at: expect.any(Date),
        },
      });
    });
  });

  describe("trackHoldConversion", () => {
    // Test that successful hold-to-booking conversions are tracked
    it("should mark hold analytics as converted", async () => {
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
  });

  describe("getAnalyticsInsights", () => {
    const startDate = new Date("2024-12-19T00:00:00Z");
    const endDate = new Date("2024-12-20T23:59:59Z");

    beforeEach(() => {
      // Mock hold analytics
      mockPrisma.holdAnalytics.findMany.mockResolvedValue([
        {
          id: "1",
          converted: true,
          expired_at: null,
          held_at: startDate,
          session_id: "session_1",
          service_id: "service_123",
          staff_id: "staff_123",
        },
        {
          id: "2",
          converted: false,
          expired_at: endDate,
          held_at: startDate,
          session_id: "session_2",
          service_id: "service_123",
          staff_id: "staff_123",
        },
        {
          id: "3",
          converted: true,
          expired_at: null,
          held_at: startDate,
          session_id: "session_3",
          service_id: "service_123",
          staff_id: "staff_123",
        },
      ]);

      // Mock booking analytics
      (mockPrisma.booking.aggregate as jest.Mock).mockResolvedValue({
        _count: 10,
        _sum: { final_price: 65000 },
        _avg: { final_price: 6500 },
        _max: { final_price: 8500 },
        _min: { final_price: 4500 },
      });

      // Mock service analytics
      (mockPrisma.booking.groupBy as jest.Mock).mockResolvedValue([
        {
          service_id: "service_1",
          _count: { service_id: 5 },
          _sum: { final_price: 32500 },
        },
        {
          service_id: "service_2",
          _count: { service_id: 3 },
          _sum: { final_price: 18000 },
        },
      ]);

      mockPrisma.service.findMany.mockResolvedValue([
        {
          id: "service_1",
          name: "Haircut",
          duration_minutes: 60,
          base_price: 6500,
          created_at: new Date(),
        },
        {
          id: "service_2",
          name: "Hair Color",
          duration_minutes: 120,
          base_price: 8500,
          created_at: new Date(),
        },
      ]);

      // Mock staff analytics
      (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([
        {
          id: "staff_1",
          name: "Sarah",
          user_id: "user_1",
          bio: null,
          photo_url: null,
          services: ["service_123"],
          created_at: new Date(),
        },
      ]);

      // Mock customer analytics
      (mockPrisma.booking.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            service_id: "service_1",
            _count: { service_id: 5 },
            _sum: { final_price: 32500 },
          },
        ])
        .mockResolvedValueOnce([
          {
            staff_id: "staff_1",
            _count: { staff_id: 8 },
            _sum: { final_price: 52000 },
          },
        ])
        .mockResolvedValueOnce([
          {
            customer_phone: "+1234567890",
            _count: { customer_phone: 2 },
            _sum: { final_price: 13000 },
          },
          {
            customer_phone: "+0987654321",
            _count: { customer_phone: 1 },
            _sum: { final_price: 6500 },
          },
        ]);

      // Mock additional queries
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: "booking_1",
          slot_datetime: new Date("2024-12-20T10:00:00Z"),
          staff_id: "staff_123",
          service_id: "service_123",
          customer_name: "John Doe",
          customer_phone: "+1234567890",
          customer_id: null,
          customer_email: null,
          final_price: 6500,
          created_at: new Date(),
        },
        {
          id: "booking_2",
          slot_datetime: new Date("2024-12-20T14:00:00Z"),
          staff_id: "staff_123",
          service_id: "service_123",
          customer_name: "Jane Doe",
          customer_phone: "+0987654321",
          customer_id: null,
          customer_email: null,
          final_price: 6500,
          created_at: new Date(),
        },
      ]);

      (mockPrisma.holdAnalytics.groupBy as jest.Mock).mockResolvedValue([
        {
          staff_id: "staff_1",
          _count: { staff_id: 3 },
          _sum: { converted: 2 },
        },
      ]);
    });

    // Test that all analytics data is aggregated correctly into comprehensive insights
    it("should return comprehensive analytics insights", async () => {
      const result = await analyticsService.getAnalyticsInsights({
        startDate,
        endDate,
      });

      expect(result).toMatchObject({
        // Hold Analytics
        totalHolds: 3,
        convertedHolds: 2,
        expiredHolds: 1,
        conversionRate: 66.67,

        // Booking Analytics
        totalBookings: 10,
        totalRevenue: 65000,
        averageBookingValue: 6500,

        // Service Analytics
        popularServices: expect.arrayContaining([
          expect.objectContaining({
            serviceId: "service_1",
            serviceName: "Haircut",
            bookingCount: 5,
            revenue: 32500,
          }),
        ]),

        // Time Analytics
        peakHours: expect.arrayContaining([
          expect.objectContaining({
            hour: expect.any(Number),
            bookingCount: expect.any(Number),
          }),
        ]),

        // Customer Analytics
        returningCustomerRate: expect.any(Number),
        averageCustomerSpend: expect.any(Number),
      });
    });

    // Test that database errors are handled gracefully with fallback empty insights
    it("should handle errors gracefully and return empty insights", async () => {
      mockPrisma.holdAnalytics.findMany.mockRejectedValue(
        new Error("Database error")
      );

      const result = await analyticsService.getAnalyticsInsights({
        startDate,
        endDate,
      });

      expect(result).toMatchObject({
        totalHolds: 0,
        convertedHolds: 0,
        expiredHolds: 0,
        conversionRate: 0,
        totalBookings: 0,
        totalRevenue: 0,
        averageBookingValue: 0,
        popularServices: [],
        staffPerformance: [],
        peakHours: [],
        returningCustomerRate: 0,
        averageCustomerSpend: 0,
      });
    });
  });

  describe("getConversionFunnel", () => {
    // Test that conversion funnel metrics are calculated correctly (conversion rates, abandonment)
    it("should return conversion funnel data", async () => {
      const startDate = new Date("2024-12-19T00:00:00Z");
      const endDate = new Date("2024-12-20T23:59:59Z");

      const mockHolds = [
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
        }, // abandoned
        {
          id: "4",
          converted: true,
          expired_at: null,
          session_id: "session_4",
          service_id: "service_123",
          staff_id: "staff_123",
          held_at: new Date(),
        },
      ];

      mockPrisma.holdAnalytics.findMany.mockResolvedValue(mockHolds);

      const result = await analyticsService.getConversionFunnel({
        startDate,
        endDate,
      });

      expect(result).toEqual({
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

  describe("getDashboardMetrics", () => {
    // Test that today's analytics are aggregated for real-time dashboard display
    it("should return today's analytics", async () => {
      // Mock today's date
      const today = new Date("2024-12-20T00:00:00Z");
      mockDateNow(today);

      // Mock analytics for today
      mockPrisma.holdAnalytics.findMany.mockResolvedValue([]);
      (mockPrisma.booking.aggregate as jest.Mock).mockResolvedValue({
        _count: 5,
        _sum: { final_price: 32500 },
        _avg: { final_price: 6500 },
        _max: { final_price: 8500 },
        _min: { final_price: 4500 },
      });
      (mockPrisma.booking.groupBy as jest.Mock).mockResolvedValue([]);
      mockPrisma.service.findMany.mockResolvedValue([]);
      mockPrisma.staff.findMany.mockResolvedValue([]);
      mockPrisma.booking.findMany.mockResolvedValue([]);
      (mockPrisma.holdAnalytics.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await analyticsService.getDashboardMetrics();

      expect(result).toBeDefined();
      expect(result.totalBookings).toBe(5);
      expect(result.totalRevenue).toBe(32500);
    });
  });
});
