/**
 * Hold Management API Tests
 * Tests the REST endpoints for hold operations
 */

import { GET, POST, DELETE } from "@/app/api/holds/route";
import { NextRequest } from "next/server";
import { mockPrisma, mockDateNow, createMockHold } from "../setup";

// Mock the services
jest.mock("@/lib/services/BookingHoldService", () => ({
  BookingHoldService: {
    getInstance: () => ({
      createHold: jest.fn(),
      releaseHold: jest.fn(),
      getActiveHoldBySession: jest.fn(),
    }),
  },
}));

jest.mock("@/lib/services/AnalyticsService", () => ({
  AnalyticsService: {
    getInstance: () => ({
      trackHoldCreation: jest.fn(),
    }),
  },
}));

describe("/api/holds", () => {
  let mockHoldService: jest.Mocked<any>;
  let mockAnalyticsService: jest.Mocked<any>;

  beforeEach(() => {
    const { BookingHoldService } = require("@/lib/services/BookingHoldService");
    const { AnalyticsService } = require("@/lib/services/AnalyticsService");

    mockHoldService = BookingHoldService.getInstance();
    mockAnalyticsService = AnalyticsService.getInstance();

    mockDateNow(new Date("2024-12-20T09:00:00Z"));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/holds", () => {
    const validHoldData = {
      sessionId: "session_123",
      staffId: "staff_123",
      serviceId: "service_123",
      slotDateTime: "2024-12-20T18:00:00Z", // 10:00 AM PST
    };

    it("should create hold successfully", async () => {
      const mockHold = createMockHold({
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      mockHoldService.createHold.mockResolvedValue(mockHold);
      mockAnalyticsService.trackHoldCreation.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(validHoldData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Hold created successfully");
      expect(data.hold).toMatchObject({
        id: "hold_123",
        sessionId: "session_123",
        staffId: "staff_123",
        serviceId: "service_123",
        remainingSeconds: expect.any(Number),
        remainingTime: {
          minutes: expect.any(Number),
          seconds: expect.any(Number),
        },
      });

      expect(mockHoldService.createHold).toHaveBeenCalledWith(
        "session_123",
        "staff_123",
        "service_123",
        new Date("2024-12-20T18:00:00Z")
      );
    });

    it("should validate request data", async () => {
      const invalidData = { sessionId: "" }; // Missing required fields

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid hold data");
      expect(data.details).toBeInstanceOf(Array);
    });

    it("should reject holds for past time slots", async () => {
      const pastSlotData = {
        ...validHoldData,
        slotDateTime: "2024-12-20T08:00:00Z", // In the past
      };

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(pastSlotData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot create hold for past time slots");
    });

    it("should handle slot unavailable conflicts", async () => {
      mockHoldService.createHold.mockRejectedValue(
        new Error("Slot already booked")
      );

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(validHoldData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409); // Conflict
      expect(data.error).toBe("Slot already booked");
    });

    it("should track analytics for hold creation", async () => {
      const mockHold = createMockHold();
      mockHoldService.createHold.mockResolvedValue(mockHold);
      mockAnalyticsService.trackHoldCreation.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(validHoldData),
      });

      await POST(request);

      expect(mockAnalyticsService.trackHoldCreation).toHaveBeenCalledWith({
        sessionId: "session_123",
        staffId: "staff_123",
        serviceId: "service_123",
      });
    });

    it("should continue if analytics tracking fails", async () => {
      const mockHold = createMockHold();
      mockHoldService.createHold.mockResolvedValue(mockHold);
      mockAnalyticsService.trackHoldCreation.mockRejectedValue(
        new Error("Analytics error")
      );

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(validHoldData),
      });

      const response = await POST(request);

      expect(response.status).toBe(201); // Should still succeed
    });

    it("should handle service errors gracefully", async () => {
      mockHoldService.createHold.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(validHoldData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create hold");
    });
  });

  describe("DELETE /api/holds", () => {
    it("should release hold successfully", async () => {
      mockHoldService.releaseHold.mockResolvedValue(undefined);

      const url = new URL("http://localhost/api/holds");
      url.searchParams.set("holdId", "hold_123");
      const request = new NextRequest(url, { method: "DELETE" });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Hold released successfully");
      expect(data.holdId).toBe("hold_123");

      expect(mockHoldService.releaseHold).toHaveBeenCalledWith("hold_123");
    });

    it("should validate hold ID parameter", async () => {
      const url = new URL("http://localhost/api/holds");
      // No holdId parameter
      const request = new NextRequest(url, { method: "DELETE" });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid hold ID");
    });

    it("should handle service errors gracefully", async () => {
      mockHoldService.releaseHold.mockRejectedValue(
        new Error("Hold not found")
      );

      const url = new URL("http://localhost/api/holds");
      url.searchParams.set("holdId", "nonexistent");
      const request = new NextRequest(url, { method: "DELETE" });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to release hold");
    });
  });

  describe("GET /api/holds", () => {
    it("should return active hold with countdown", async () => {
      const mockHold = createMockHold({
        expires_at: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes remaining
        staff: {
          id: "staff_123",
          name: "Sarah Johnson",
        },
        service: {
          id: "service_123",
          name: "Haircut",
          duration_minutes: 60,
          base_price: 6500,
        },
      });

      mockHoldService.getActiveHoldBySession.mockResolvedValue(mockHold);

      const url = new URL("http://localhost/api/holds");
      url.searchParams.set("sessionId", "session_123");
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActiveHold).toBe(true);
      expect(data.hold).toMatchObject({
        id: "hold_123",
        sessionId: "session_123",
        staffId: "staff_123",
        serviceId: "service_123",
        remainingSeconds: 180, // 3 minutes
        remainingTime: {
          minutes: 3,
          seconds: 0,
        },
        staff: {
          id: "staff_123",
          name: "Sarah Johnson",
        },
        service: {
          id: "service_123",
          name: "Haircut",
          duration_minutes: 60,
          base_price: 6500,
        },
      });
    });

    it("should return no active hold when none exists", async () => {
      mockHoldService.getActiveHoldBySession.mockResolvedValue(null);

      const url = new URL("http://localhost/api/holds");
      url.searchParams.set("sessionId", "session_123");
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActiveHold).toBe(false);
      expect(data.message).toBe("No active hold found for this session");
    });

    it("should return expired status for expired holds", async () => {
      const expiredHold = createMockHold({
        expires_at: new Date(Date.now() - 1000), // 1 second ago (expired)
      });

      mockHoldService.getActiveHoldBySession.mockResolvedValue(expiredHold);

      const url = new URL("http://localhost/api/holds");
      url.searchParams.set("sessionId", "session_123");
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActiveHold).toBe(false);
      expect(data.expired).toBe(true);
      expect(data.message).toBe("Hold has expired");
    });

    it("should validate session ID parameter", async () => {
      const url = new URL("http://localhost/api/holds");
      // No sessionId parameter
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid session ID");
    });

    it("should handle service errors gracefully", async () => {
      mockHoldService.getActiveHoldBySession.mockRejectedValue(
        new Error("Database error")
      );

      const url = new URL("http://localhost/api/holds");
      url.searchParams.set("sessionId", "session_123");
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check hold status");
    });

    it("should calculate remaining time correctly", async () => {
      const mockHold = createMockHold({
        expires_at: new Date(Date.now() + 2 * 60 * 1000 + 30 * 1000), // 2 minutes 30 seconds
      });

      mockHoldService.getActiveHoldBySession.mockResolvedValue(mockHold);

      const url = new URL("http://localhost/api/holds");
      url.searchParams.set("sessionId", "session_123");
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(data.hold.remainingSeconds).toBe(150); // 2:30 = 150 seconds
      expect(data.hold.remainingTime).toEqual({
        minutes: 2,
        seconds: 30,
      });
    });
  });
});

