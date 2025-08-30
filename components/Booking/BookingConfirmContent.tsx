"use client";

/**
 * Booking Confirmation Content
 * Final booking step with hold countdown, customer details, and confirmation
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  User,
  Phone,
  ArrowLeft,
  Check,
  AlertCircle,
  Timer,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { HoldCountdown } from "./HoldCountdown";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
}

interface Staff {
  id: string;
  name: string;
  photo_url: string | null;
}

interface BookingDetails {
  service: Service;
  staff: Staff;
  datetime: string;
  price: number;
}

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  marketingConsent?: boolean;
}

export function BookingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceId = searchParams.get("service");
  const staffId = searchParams.get("staff");
  const datetime = searchParams.get("datetime");

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(
    null
  );
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: "",
    marketingConsent: false,
  });
  const [customerFound, setCustomerFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    if (!serviceId || !staffId || !datetime) {
      router.push("/booking");
      return;
    }
    initializeBooking();
  }, [serviceId, staffId, datetime]);

  const initializeBooking = async () => {
    try {
      // Fetch booking details and create hold
      const [serviceResponse, staffResponse] = await Promise.all([
        fetch(`/api/services/${serviceId}`),
        fetch(`/api/staff/${staffId}`),
      ]);

      if (!serviceResponse.ok || !staffResponse.ok) {
        throw new Error("Failed to fetch booking details");
      }

      const [serviceData, staffData] = await Promise.all([
        serviceResponse.json(),
        staffResponse.json(),
      ]);

      // Get actual staff pricing (override or base price)
      const actualPrice =
        (serviceId && staffData.staff.customPricing?.[serviceId]) ||
        serviceData.service.base_price;

      const bookingDetails: BookingDetails = {
        service: serviceData.service,
        staff: staffData.staff,
        datetime: datetime!,
        price: actualPrice, // Use actual staff pricing
      };

      setBookingDetails(bookingDetails);

      // Create hold
      await createBookingHold();
    } catch (error) {
      console.error("Error initializing booking:", error);
      setError("Failed to initialize booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const createBookingHold = async () => {
    try {
      const response = await fetch("/api/holds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          staffId,
          serviceId,
          slotDateTime: datetime,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create booking hold");
      }

      const data = await response.json();

      if (!data.hold || !data.hold.id || !data.hold.expiresAt) {
        throw new Error("Invalid hold data received");
      }

      setHoldId(data.hold.id);

      // Validate and parse expiry time
      const expiryDate = new Date(data.hold.expiresAt);
      if (isNaN(expiryDate.getTime())) {
        throw new Error("Invalid expiry date received");
      }

      setHoldExpiry(expiryDate);
    } catch (error) {
      console.error("Error creating hold:", error);
      setError(
        "This time slot may no longer be available. Please try another time."
      );
    }
  };

  const handleCustomerLookup = useCallback(async (phone: string) => {
    if (phone.length < 10) return;

    try {
      const response = await fetch(
        `/api/customers/lookup?query=${encodeURIComponent(phone)}&type=phone`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.customer) {
          setCustomerData({
            name: data.customer.name || "",
            phone: data.customer.phone || phone,
            email: data.customer.email || "",
            marketingConsent: data.customer.marketing_consent || false,
          });
          setCustomerFound(true);
        }
      }
    } catch (error) {
      console.error("Error looking up customer:", error);
    }
  }, []);

  const handlePhoneChange = (phone: string) => {
    // Format phone number
    const formatted = phone.replace(/\D/g, "").slice(0, 10);
    setCustomerData((prev) => ({ ...prev, phone: formatted }));

    // Auto-lookup existing customer
    if (formatted.length === 10) {
      handleCustomerLookup(formatted);
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingDetails || !holdId) return;

    setSubmitting(true);
    setError(null);

    try {
      // Convert hold to booking
      const response = await fetch(`/api/holds/${holdId}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerData.name,
          customerPhone: customerData.phone,
          customerEmail: customerData.email,
          marketingConsent: customerData.marketingConsent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to confirm booking");
      }

      const data = await response.json();

      // Navigate to success page
      router.push(`/booking/success?booking=${data.booking.id}`);
    } catch (error) {
      console.error("Error confirming booking:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to confirm booking. Please try again.";

      // Special handling for expired holds
      if (
        errorMessage.includes("expired") ||
        errorMessage.includes("select a new time")
      ) {
        router.push(
          `/booking/datetime?service=${bookingDetails?.service.id}&staff=${bookingDetails?.staff.id}`
        );
        return;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHoldExpired = () => {
    setError("Your booking hold has expired. Please select a new time.");
    setTimeout(() => {
      router.push(`/booking/datetime?service=${serviceId}&staff=${staffId}`);
    }, 2000);
  };

  const handleBack = () => {
    router.push(`/booking/datetime?service=${serviceId}&staff=${staffId}`);
  };

  const formatDateTime = (datetime: string) => {
    const date = parseISO(datetime);
    return format(date, "EEEE, MMMM d 'at' h:mm a");
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(0)}`;
  };

  const isFormValid =
    customerData.name.trim() && customerData.phone.length === 10;

  if (loading) {
    return <div className="max-w-2xl mx-auto">Loading...</div>;
  }

  if (error && !holdExpiry) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Booking Error
        </h3>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={handleBack}
          className="inline-flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (!bookingDetails) {
    return <div className="max-w-2xl mx-auto">Booking details not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hold countdown */}
      {holdExpiry && (
        <HoldCountdown expiryTime={holdExpiry} onExpired={handleHoldExpired} />
      )}

      {/* Booking summary */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Check className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Booking Summary
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Service</span>
            <span className="font-medium">{bookingDetails.service.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Stylist</span>
            <span className="font-medium">{bookingDetails.staff.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Date & Time</span>
            <span className="font-medium">
              {formatDateTime(bookingDetails.datetime)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Duration</span>
            <span className="font-medium">
              {bookingDetails.service.duration_minutes} minutes
            </span>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-pink-600">
                {formatPrice(bookingDetails.price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer details form */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <User className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-900">Your Details</h3>
        </div>

        {customerFound && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700">
              Welcome back! We found your information.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              value={customerData.name}
              onChange={(e) =>
                setCustomerData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              value={customerData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="(555) 123-4567"
              maxLength={10}
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email (Optional)
            </label>
            <input
              type="email"
              id="email"
              value={customerData.email}
              onChange={(e) =>
                setCustomerData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="marketing"
              checked={customerData.marketingConsent}
              onChange={(e) =>
                setCustomerData((prev) => ({
                  ...prev,
                  marketingConsent: e.target.checked,
                }))
              }
              className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <label htmlFor="marketing" className="text-sm text-gray-600">
              I&apos;d like to receive promotional offers and updates from
              BeautiBook
            </label>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleBack}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={handleConfirmBooking}
          disabled={!isFormValid || submitting}
          className="flex-1 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <Timer className="w-4 h-4 inline mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 inline mr-2" />
              Confirm Booking
            </>
          )}
        </button>
      </div>

      {/* Navigation help */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Need to change your selection?{" "}
          <button
            onClick={() => router.push("/booking")}
            className="text-pink-600 hover:text-pink-700 underline"
          >
            Start over
          </button>
        </p>
      </div>
    </div>
  );
}
