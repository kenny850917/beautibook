/**
 * BookingService Core Tests
 * Following backend.mdc MVP patterns - testing critical business logic only
 */

import { BookingService } from "@/lib/services/BookingService";
import { AvailabilityService } from "@/lib/services/AvailabilityService";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// Mock all dependencies following backend.mdc simple mocking
jest.mock("@/lib/services/AvailabilityService");

// Mock the prisma export that BookingService directly imports
jest.mock("@/lib/services/PrismaService", () => ({
  PrismaService: {
    getInstance: jest.fn(),
  },
  prisma: undefined, // Will be set in beforeEach
}));

const mockPrisma = mockDeep<PrismaClient>();
const mockAvailabilityService = mockDeep<AvailabilityService>();

describe("BookingService - Core Business Logic", () => {
  let bookingService: BookingService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    mockReset(mockPrisma);
    mockReset(mockAvailabilityService);

    // Mock console.error to suppress error logs during tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Setup the mocked prisma export that BookingService imports
    const PrismaServiceModule = require("@/lib/services/PrismaService");
    PrismaServiceModule.prisma = mockPrisma;

    // Mock singleton instances
    jest
      .spyOn(AvailabilityService, "getInstance")
      .mockReturnValue(mockAvailabilityService);

    bookingService = BookingService.getInstance();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createBooking() - Critical Business Logic", () => {
    const mockBookingData = {
      staffId: "staff_123",
      serviceId: "service_456",
      slotDateTime: new Date("2024-01-15T14:30:00Z"),
      customerName: "John Doe",
      customerPhone: "+15551234567",
      sessionId: "session_789",
      customerId: "customer_abc",
      customerEmail: "john@example.com",
    };

    const mockStaff = {
      id: "staff_123",
      services: ["service_456"],
      user: { id: "user_123", email: "staff@example.com" },
    };

    const mockService = {
      id: "service_456",
      name: "Haircut",
      duration_minutes: 60,
      base_price: 6500, // $65.00 in cents
    };

    const mockCreatedBooking = {
      id: "booking_123",
      staff_id: "staff_123",
      service_id: "service_456",
      slot_datetime: mockBookingData.slotDateTime,
      customer_name: "John Doe",
      customer_phone: "+15551234567",
      customer_id: "customer_abc",
      customer_email: "john@example.com",
      final_price: 6500,
      staff: mockStaff,
      service: mockService,
    };

    beforeEach(() => {
      // Setup default successful transaction mock
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma as any);
      });

      // Setup default successful mocks
      mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as any);
      mockPrisma.service.findUnique.mockResolvedValue(mockService as any);
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.staffServicePricing.findFirst.mockResolvedValue(null);
      mockPrisma.bookingHold.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.booking.create.mockResolvedValue(mockCreatedBooking as any);
      mockPrisma.holdAnalytics.updateMany.mockResolvedValue({
        count: 1,
      } as any);

      mockAvailabilityService.isStaffAvailable.mockResolvedValue(true);
    });

    it("should create booking successfully with all validations", async () => {
      const result = await bookingService.createBooking(
        mockBookingData.staffId,
        mockBookingData.serviceId,
        mockBookingData.slotDateTime,
        mockBookingData.customerName,
        mockBookingData.customerPhone,
        mockBookingData.sessionId,
        mockBookingData.customerId,
        mockBookingData.customerEmail
      );

      expect(result).toEqual(mockCreatedBooking);
      expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
        where: { id: "staff_123" },
        include: { user: true },
      });
      expect(mockPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: "service_456" },
      });
      expect(mockAvailabilityService.isStaffAvailable).toHaveBeenCalledWith(
        "staff_123",
        mockBookingData.slotDateTime,
        60
      );
      // No SSE notifications in MVP
    });

    it("should reject booking if staff cannot perform service", async () => {
      // Staff doesn't have this service
      mockPrisma.staff.findUnique.mockResolvedValue({
        ...mockStaff,
        services: ["other_service"], // Different service
      } as any);

      await expect(
        bookingService.createBooking(
          mockBookingData.staffId,
          mockBookingData.serviceId,
          mockBookingData.slotDateTime,
          mockBookingData.customerName,
          mockBookingData.customerPhone
        )
      ).rejects.toThrow("Staff member cannot perform this service");
    });

    it("should reject booking if slot already booked", async () => {
      // Existing booking at same time
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: "existing_booking",
        staff_id: "staff_123",
        slot_datetime: mockBookingData.slotDateTime,
      } as any);

      await expect(
        bookingService.createBooking(
          mockBookingData.staffId,
          mockBookingData.serviceId,
          mockBookingData.slotDateTime,
          mockBookingData.customerName,
          mockBookingData.customerPhone
        )
      ).rejects.toThrow("Time slot already booked");
    });

    it("should reject booking if staff not available", async () => {
      mockAvailabilityService.isStaffAvailable.mockResolvedValue(false);

      await expect(
        bookingService.createBooking(
          mockBookingData.staffId,
          mockBookingData.serviceId,
          mockBookingData.slotDateTime,
          mockBookingData.customerName,
          mockBookingData.customerPhone
        )
      ).rejects.toThrow("Staff is not available at this time");
    });

    it("should use staff custom pricing when available", async () => {
      const customPricing = {
        staff_id: "staff_123",
        service_id: "service_456",
        custom_price: 7500, // $75.00 custom price
      };

      mockPrisma.staffServicePricing.findFirst.mockResolvedValue(
        customPricing as any
      );
      mockPrisma.booking.create.mockResolvedValue({
        ...mockCreatedBooking,
        final_price: 7500,
      } as any);

      const result = await bookingService.createBooking(
        mockBookingData.staffId,
        mockBookingData.serviceId,
        mockBookingData.slotDateTime,
        mockBookingData.customerName,
        mockBookingData.customerPhone
      );

      expect(result.final_price).toBe(7500);
      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            final_price: 7500,
          }),
        })
      );
    });

    it("should complete successfully without SSE notifications", async () => {
      // SSE is disabled for MVP, so no notifications should be sent
      const result = await bookingService.createBooking(
        mockBookingData.staffId,
        mockBookingData.serviceId,
        mockBookingData.slotDateTime,
        mockBookingData.customerName,
        mockBookingData.customerPhone
      );

      expect(result).toEqual(mockCreatedBooking);
      // No SSE functionality in MVP
    });

    it("should clean up holds when converting from session", async () => {
      await bookingService.createBooking(
        mockBookingData.staffId,
        mockBookingData.serviceId,
        mockBookingData.slotDateTime,
        mockBookingData.customerName,
        mockBookingData.customerPhone,
        "session_789" // With session ID
      );

      expect(mockPrisma.bookingHold.deleteMany).toHaveBeenCalledWith({
        where: {
          session_id: "session_789",
          staff_id: "staff_123",
          service_id: "service_456",
          slot_datetime: mockBookingData.slotDateTime,
        },
      });

      expect(mockPrisma.holdAnalytics.updateMany).toHaveBeenCalledWith({
        where: {
          session_id: "session_789",
          staff_id: "staff_123",
          service_id: "service_456",
          converted: false,
        },
        data: {
          converted: true,
        },
      });
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = BookingService.getInstance();
      const instance2 = BookingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
