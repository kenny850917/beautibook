/**
 * Basic Hold API Test
 * Focus on input validation only - following backend.mdc MVP principles
 */

import { POST } from "@/app/api/holds/route";
import { NextRequest } from "next/server";

// Mock the services
jest.mock("@/lib/services/BookingHoldService");
jest.mock("@/lib/services/AnalyticsService");

describe("/api/holds - Input Validation", () => {
  describe("POST /api/holds", () => {
    it("should reject invalid input data", async () => {
      const invalidHoldData = {
        sessionId: "", // Invalid empty session
        staffId: "staff_123",
        serviceId: "service_123",
        slotDateTime: "2024-12-20T18:00:00Z",
      };

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(invalidHoldData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should reject past time slots", async () => {
      const pastSlotData = {
        sessionId: "session_123",
        staffId: "staff_123",
        serviceId: "service_123",
        slotDateTime: "2020-01-01T10:00:00Z", // Past date
      };

      const request = new NextRequest("http://localhost/api/holds", {
        method: "POST",
        body: JSON.stringify(pastSlotData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("past time");
    });
  });
});
