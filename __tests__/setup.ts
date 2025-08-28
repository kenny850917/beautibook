/**
 * Test Setup for BeautiBook Phase 4
 * Sets up test database and mocks for isolated testing
 */

import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

export const mockPrisma = mockDeep<PrismaClient>();

// Mock PrismaService
jest.mock("../lib/services/PrismaService", () => ({
  PrismaService: {
    getInstance: jest.fn(() => mockPrisma),
  },
}));

beforeEach(() => {
  mockReset(mockPrisma);
});

// Mock Date.now for consistent testing
export const mockDateNow = (date: Date) => {
  jest.spyOn(Date, "now").mockReturnValue(date.getTime());
};

// Mock setTimeout for hold expiration testing
export const mockSetTimeout = () => {
  jest.useFakeTimers();
  return {
    advanceTime: (ms: number) => jest.advanceTimersByTime(ms),
    runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
    clearAllTimers: () => jest.clearAllTimers(),
  };
};

// Test data factory
export const createMockHold = (overrides = {}) => ({
  id: "hold_123",
  session_id: "session_123",
  staff_id: "staff_123",
  service_id: "service_123",
  slot_datetime: new Date("2024-12-20T10:00:00Z"),
  expires_at: new Date(Date.now() + 5 * 60 * 1000),
  created_at: new Date(),
  ...overrides,
});

export const createMockBooking = (overrides = {}) => ({
  id: "booking_123",
  staff_id: "staff_123",
  service_id: "service_123",
  slot_datetime: new Date("2024-12-20T10:00:00Z"),
  customer_name: "John Doe",
  customer_phone: "+1234567890",
  customer_id: null,
  customer_email: null,
  final_price: 6500,
  created_at: new Date(),
  service: {
    id: "service_123",
    name: "Haircut",
    duration_minutes: 60,
    base_price: 6500,
  },
  ...overrides,
});

export const createMockStaff = (overrides = {}) => ({
  id: "staff_123",
  user_id: "user_123",
  name: "Sarah Johnson",
  bio: null,
  photo_url: null,
  services: ["service_123"],
  created_at: new Date(),
  user: {
    id: "user_123",
    email: "sarah@example.com",
    role: "STAFF" as const,
  },
  ...overrides,
});

export const createMockService = (overrides = {}) => ({
  id: "service_123",
  name: "Haircut",
  duration_minutes: 60,
  base_price: 6500,
  created_at: new Date(),
  ...overrides,
});
