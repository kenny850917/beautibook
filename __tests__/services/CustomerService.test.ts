/**
 * CustomerService Core Tests
 * Following backend.mdc MVP patterns - testing critical customer lifecycle logic
 */

import { CustomerService } from "@/lib/services/CustomerService";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// Mock the PrismaService before creating mock instance
jest.mock("@/lib/services/PrismaService", () => ({
  PrismaService: {
    getInstance: jest.fn(),
  },
}));

const mockPrisma = mockDeep<PrismaClient>();

describe("CustomerService - Core Business Logic", () => {
  let customerService: CustomerService;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    mockReset(mockPrisma);

    // Mock console methods to suppress logs during tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Setup the mocked PrismaService to return our mock
    const { PrismaService } = require("@/lib/services/PrismaService");
    (PrismaService.getInstance as jest.Mock).mockReturnValue(mockPrisma);

    customerService = CustomerService.getInstance();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("findOrCreateGuestCustomer() - Critical Customer Lifecycle", () => {
    const mockCustomerData = {
      name: "John Doe",
      phone: "5551234567", // Will be normalized to +15551234567
      email: "john@example.com",
      marketingConsent: true,
      referralSource: "Google",
    };

    const mockExistingCustomer = {
      id: "customer_123",
      name: "John Smith", // Different name - should be updated
      phone: "+15551234567",
      email: "old@example.com",
      total_bookings: 5,
      total_spent: 32500, // $325.00
      last_booking_at: new Date("2024-01-01"),
      preferred_staff: "staff_123",
      preferred_service: "service_456",
      marketing_consent: false,
      referral_source: "Facebook",
      notes: null,
      created_at: new Date("2023-01-01"),
      updated_at: new Date("2024-01-01"),
    };

    const mockUpdatedCustomer = {
      ...mockExistingCustomer,
      name: "John Doe", // Updated name
      email: "john@example.com", // Updated email
      marketing_consent: true, // Updated consent
      referral_source: "Google", // Updated source
      updated_at: new Date(),
    };

    const mockNewCustomer = {
      id: "customer_new",
      name: "John Doe",
      phone: "+15551234567",
      email: "john@example.com",
      total_bookings: 0,
      total_spent: 0,
      last_booking_at: null,
      preferred_staff: null,
      preferred_service: null,
      marketing_consent: true,
      referral_source: "Google",
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe("Finding Existing Customer", () => {
      it("should find and update existing customer with new details", async () => {
        mockPrisma.customer.findUnique.mockResolvedValue(
          mockExistingCustomer as any
        );
        mockPrisma.customer.update.mockResolvedValue(
          mockUpdatedCustomer as any
        );

        const result = await customerService.findOrCreateGuestCustomer(
          mockCustomerData
        );

        expect(result).toEqual(mockUpdatedCustomer);
        expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
          where: { phone: "+15551234567" },
        });
        expect(mockPrisma.customer.update).toHaveBeenCalledWith({
          where: { id: "customer_123" },
          data: {
            name: "John Doe",
            email: "john@example.com",
            marketing_consent: true,
            referral_source: "Google",
            updated_at: expect.any(Date),
          },
        });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "Found existing customer: John Doe (+15551234567)"
        );
      });

      it("should preserve existing email if new email not provided", async () => {
        const dataWithoutEmail = {
          ...mockCustomerData,
          email: undefined,
        };

        mockPrisma.customer.findUnique.mockResolvedValue(
          mockExistingCustomer as any
        );
        mockPrisma.customer.update.mockResolvedValue({
          ...mockUpdatedCustomer,
          email: "old@example.com", // Keep existing email
        } as any);

        await customerService.findOrCreateGuestCustomer(dataWithoutEmail);

        expect(mockPrisma.customer.update).toHaveBeenCalledWith({
          where: { id: "customer_123" },
          data: {
            name: "John Doe",
            email: "old@example.com", // Should use existing email
            marketing_consent: true,
            referral_source: "Google",
            updated_at: expect.any(Date),
          },
        });
      });

      it("should preserve existing marketing consent if not provided", async () => {
        const dataWithoutConsent = {
          ...mockCustomerData,
          marketingConsent: undefined,
        };

        mockPrisma.customer.findUnique.mockResolvedValue(
          mockExistingCustomer as any
        );
        mockPrisma.customer.update.mockResolvedValue({
          ...mockUpdatedCustomer,
          marketing_consent: false, // Keep existing consent
        } as any);

        await customerService.findOrCreateGuestCustomer(dataWithoutConsent);

        expect(mockPrisma.customer.update).toHaveBeenCalledWith({
          where: { id: "customer_123" },
          data: {
            name: "John Doe",
            email: "john@example.com",
            marketing_consent: false, // Should use existing consent
            referral_source: "Google",
            updated_at: expect.any(Date),
          },
        });
      });
    });

    describe("Creating New Customer", () => {
      it("should create new customer when not found", async () => {
        mockPrisma.customer.findUnique.mockResolvedValue(null);
        mockPrisma.customer.create.mockResolvedValue(mockNewCustomer as any);

        const result = await customerService.findOrCreateGuestCustomer(
          mockCustomerData
        );

        expect(result).toEqual(mockNewCustomer);
        expect(mockPrisma.customer.create).toHaveBeenCalledWith({
          data: {
            name: "John Doe",
            phone: "+15551234567",
            email: "john@example.com",
            total_bookings: 0,
            total_spent: 0,
            last_booking_at: null,
            preferred_staff: null,
            preferred_service: null,
            marketing_consent: true,
            referral_source: "Google",
            notes: null,
          },
        });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "Created new customer: John Doe (+15551234567)"
        );
      });

      it("should create customer with defaults when minimal data provided", async () => {
        const minimalData = {
          name: "Jane Doe",
          phone: "5559876543",
        };

        mockPrisma.customer.findUnique.mockResolvedValue(null);
        mockPrisma.customer.create.mockResolvedValue({
          ...mockNewCustomer,
          id: "customer_jane",
          name: "Jane Doe",
          phone: "+15559876543",
          email: null,
          marketing_consent: false,
          referral_source: null,
        } as any);

        const result = await customerService.findOrCreateGuestCustomer(
          minimalData
        );

        expect(mockPrisma.customer.create).toHaveBeenCalledWith({
          data: {
            name: "Jane Doe",
            phone: "+15559876543",
            email: null,
            total_bookings: 0,
            total_spent: 0,
            last_booking_at: null,
            preferred_staff: null,
            preferred_service: null,
            marketing_consent: false,
            referral_source: null,
            notes: null,
          },
        });
      });
    });

    describe("Phone Number Normalization", () => {
      it("should normalize various phone number formats", async () => {
        mockPrisma.customer.findUnique.mockResolvedValue(null);
        mockPrisma.customer.create.mockResolvedValue(mockNewCustomer as any);

        const testCases = [
          "5551234567", // No formatting
          "(555) 123-4567", // Standard format
          "555-123-4567", // Dashes
          "555.123.4567", // Dots
          "+1 555 123 4567", // International with spaces
          "1-555-123-4567", // With country code
        ];

        for (const phoneInput of testCases) {
          mockPrisma.customer.findUnique.mockClear();

          await customerService.findOrCreateGuestCustomer({
            name: "Test User",
            phone: phoneInput,
          });

          expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
            where: { phone: "+15551234567" },
          });
        }
      });
    });

    describe("Error Handling", () => {
      it("should handle database errors gracefully", async () => {
        mockPrisma.customer.findUnique.mockRejectedValue(
          new Error("Database connection failed")
        );

        await expect(
          customerService.findOrCreateGuestCustomer(mockCustomerData)
        ).rejects.toThrow("Failed to create customer record");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error finding/creating customer:",
          expect.any(Error)
        );
      });

      it("should handle update errors gracefully", async () => {
        mockPrisma.customer.findUnique.mockResolvedValue(
          mockExistingCustomer as any
        );
        mockPrisma.customer.update.mockRejectedValue(
          new Error("Update failed")
        );

        await expect(
          customerService.findOrCreateGuestCustomer(mockCustomerData)
        ).rejects.toThrow("Failed to create customer record");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error finding/creating customer:",
          expect.any(Error)
        );
      });
    });
  });

  describe("updateCustomerAfterBooking() - Customer Statistics", () => {
    const mockCustomer = {
      id: "customer_123",
      total_bookings: 2,
      total_spent: 12000, // $120.00
    };

    const mockBookingData = {
      final_price: 6500, // $65.00
      slot_datetime: new Date("2024-01-15T14:30:00Z"),
      service_id: "service_456",
      staff_id: "staff_123",
    };

    it("should update customer statistics after booking", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer as any);
      mockPrisma.customer.update.mockResolvedValue({
        ...mockCustomer,
        total_bookings: 3,
        total_spent: 18500,
      } as any);

      await customerService.updateCustomerAfterBooking(
        "customer_123",
        mockBookingData
      );

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: "customer_123" },
        data: {
          total_bookings: 3,
          total_spent: 18500,
          last_booking_at: mockBookingData.slot_datetime,
          preferred_staff: "staff_123",
          preferred_service: "service_456",
          updated_at: expect.any(Date),
        },
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Updated customer stats: undefined - 3 bookings, $185 spent"
      );
    });

    it("should handle customer not found error", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        customerService.updateCustomerAfterBooking(
          "nonexistent",
          mockBookingData
        )
      ).rejects.toThrow("Customer not found");
    });

    it("should handle update errors gracefully", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer as any);
      mockPrisma.customer.update.mockRejectedValue(new Error("Update failed"));

      await expect(
        customerService.updateCustomerAfterBooking(
          "customer_123",
          mockBookingData
        )
      ).rejects.toThrow("Update failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating customer after booking:",
        expect.any(Error)
      );
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = CustomerService.getInstance();
      const instance2 = CustomerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
