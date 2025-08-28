/**
 * Availability API Tests
 * Tests time slot generation and conflict detection
 */

import { GET } from "@/app/api/availability/route";
import { NextRequest } from "next/server";
import {
  mockPrisma,
  createMockStaff,
  createMockService,
  createMockBooking,
  createMockHold,
} from "../setup";

// Mock the services
jest.mock("@/lib/services/AvailabilityService", () => ({
  AvailabilityService: {
    getInstance: () => ({
      getStaffAvailability: jest.fn(),
    }),
  },
}));

describe("/api/availability", () => {
  let mockAvailabilityService: jest.Mocked<any>;

  beforeEach(() => {
    const {
      AvailabilityService,
    } = require("@/lib/services/AvailabilityService");
    mockAvailabilityService = AvailabilityService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (params: Record<string, string>) => {
    const url = new URL("http://localhost/api/availability");
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  describe("GET /api/availability", () => {
    const validParams = {
      staffId: "staff_123",
      serviceId: "service_123",
      date: "2024-12-20",
    };

    beforeEach(() => {
      // Mock staff and service existence
      mockPrisma.staff.findUnique.mockResolvedValue(
        createMockStaff({
          id: "staff_123",
          services: ["service_123"],
        })
      );

      mockPrisma.service.findUnique.mockResolvedValue(
        createMockService({
          id: "service_123",
          duration_minutes: 60,
        })
      );

      // Mock staff availability
      mockAvailabilityService.getStaffAvailability.mockResolvedValue([
        { start_time: "09:00", end_time: "17:00" },
      ]);

      // Mock no existing bookings or holds
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.bookingHold.findMany.mockResolvedValue([]);
    });

    it("should return available time slots", async () => {
      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.slots).toBeInstanceOf(Array);
      expect(data.totalSlots).toBeGreaterThan(0);
      expect(data.staffName).toBe("Sarah Johnson");
      expect(data.serviceName).toBe("Haircut");

      // Check slot structure
      if (data.slots.length > 0) {
        const slot = data.slots[0];
        expect(slot).toHaveProperty("datetime");
        expect(slot).toHaveProperty("available");
        expect(slot).toHaveProperty("pstTime");
      }
    });

    it("should validate required parameters", async () => {
      const request = createRequest({});
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid query parameters");
      expect(data.details).toBeInstanceOf(Array);
    });

    it("should return 404 for non-existent staff", async () => {
      mockPrisma.staff.findUnique.mockResolvedValue(null);

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Staff member not found");
    });

    it("should return 404 for non-existent service", async () => {
      mockPrisma.service.findUnique.mockResolvedValue(null);

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Service not found");
    });

    it("should return 400 if staff cannot perform service", async () => {
      mockPrisma.staff.findUnique.mockResolvedValue(
        createMockStaff({
          services: ["different_service"],
        })
      );

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Staff member cannot perform this service");
    });

    it("should return empty slots when staff not available", async () => {
      mockAvailabilityService.getStaffAvailability.mockResolvedValue([]);

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.slots).toEqual([]);
      expect(data.message).toBe("Staff member is not available on this date");
    });

    it("should mark slots as unavailable when booked", async () => {
      // Mock existing booking at 10:00 AM
      const existingBooking = createMockBooking({
        slot_datetime: new Date("2024-12-20T18:00:00Z"), // 10:00 AM PST
        service: { duration_minutes: 60 },
      });
      mockPrisma.booking.findMany.mockResolvedValue([existingBooking]);

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Find the 10:00 AM slot and verify it's unavailable
      const bookedSlot = data.slots.find(
        (slot: any) => slot.pstTime === "10:00 AM"
      );
      if (bookedSlot) {
        expect(bookedSlot.available).toBe(false);
        expect(bookedSlot.reason).toContain("booked");
      }
    });

    it("should mark slots as unavailable when held", async () => {
      // Mock active hold at 2:00 PM
      const activeHold = createMockHold({
        slot_datetime: new Date("2024-12-20T22:00:00Z"), // 2:00 PM PST
        expires_at: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes remaining
      });
      mockPrisma.bookingHold.findMany.mockResolvedValue([activeHold]);

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Find the 2:00 PM slot and verify it's unavailable
      const heldSlot = data.slots.find(
        (slot: any) => slot.pstTime === "2:00 PM"
      );
      if (heldSlot) {
        expect(heldSlot.available).toBe(false);
        expect(heldSlot.reason).toContain("held");
      }
    });

    it("should handle overlapping bookings correctly", async () => {
      // Mock 2-hour booking at 10:00 AM (blocks 10:00-12:00)
      const longBooking = createMockBooking({
        slot_datetime: new Date("2024-12-20T18:00:00Z"), // 10:00 AM PST
        service: { duration_minutes: 120 }, // 2 hours
      });
      mockPrisma.booking.findMany.mockResolvedValue([longBooking]);

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // All slots from 10:00-12:00 should be unavailable due to overlap
      const conflictSlots = data.slots.filter((slot: any) =>
        [
          "10:00 AM",
          "10:15 AM",
          "10:30 AM",
          "10:45 AM",
          "11:00 AM",
          "11:15 AM",
          "11:30 AM",
          "11:45 AM",
        ].includes(slot.pstTime)
      );

      conflictSlots.forEach((slot: any) => {
        expect(slot.available).toBe(false);
      });
    });

    it("should generate 15-minute intervals", async () => {
      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.slots.length >= 2) {
        const times = data.slots.map((slot: any) =>
          new Date(slot.datetime).getMinutes()
        );
        const intervals = [];

        for (let i = 1; i < times.length; i++) {
          const diff = times[i] - times[i - 1];
          // Handle hour rollover
          intervals.push(diff === -45 ? 15 : diff);
        }

        // All intervals should be 15 minutes
        intervals.forEach((interval) => {
          expect(interval).toBe(15);
        });
      }
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.staff.findUnique.mockRejectedValue(
        new Error("Database connection error")
      );

      const request = createRequest(validParams);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get availability");
    });
  });
});

