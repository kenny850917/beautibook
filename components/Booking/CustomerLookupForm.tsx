"use client";

import { useState, useEffect } from "react";

interface CustomerSuggestion {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    total_bookings: number;
    preferred_staff?: string;
    preferred_service?: string;
    last_booking_at?: Date;
  };
  suggestions: {
    name: string;
    email?: string;
    phone: string;
    preferredStaff?: string;
    preferredService?: string;
    totalBookings: number;
    lastBooking?: Date;
  };
}

interface CustomerLookupFormProps {
  onCustomerData: (data: {
    name: string;
    phone: string;
    email?: string;
    isReturningCustomer: boolean;
    customerId?: string;
  }) => void;
  onStaffSuggestion?: (staffId: string) => void;
  onServiceSuggestion?: (serviceId: string) => void;
}

export default function CustomerLookupForm({
  onCustomerData,
  onStaffSuggestion,
  onServiceSuggestion,
}: CustomerLookupFormProps) {
  const [phoneInput, setPhoneInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [customerSuggestion, setCustomerSuggestion] =
    useState<CustomerSuggestion | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showReturningCustomerBanner, setShowReturningCustomerBanner] =
    useState(false);

  // Phone input formatting
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX for US numbers
    if (phoneNumber.length >= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
        3,
        6
      )}-${phoneNumber.slice(6, 10)}`;
    } else if (phoneNumber.length >= 3) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return phoneNumber;
    }
  };

  // Quick customer lookup when phone is entered
  useEffect(() => {
    const lookupCustomer = async () => {
      const rawPhone = phoneInput.replace(/\D/g, "");

      // Only lookup when we have at least 10 digits (US phone number)
      if (rawPhone.length >= 10) {
        setIsLookingUp(true);

        try {
          // TODO: Replace with actual API call in Phase 4
          // const response = await fetch(`/api/customers/lookup?phone=${rawPhone}`);

          // Mock customer lookup
          const mockCustomerLookup = (): CustomerSuggestion | null => {
            const mockCustomers = [
              {
                phone: "1234567890",
                customer: {
                  id: "customer_1",
                  name: "Sarah Johnson",
                  phone: "+1234567890",
                  email: "sarah@example.com",
                  total_bookings: 15,
                  preferred_staff: "staff_sarah",
                  preferred_service: "service_haircut",
                  last_booking_at: new Date(2024, 10, 15),
                },
              },
              {
                phone: "9876543210",
                customer: {
                  id: "customer_2",
                  name: "Mike Chen",
                  phone: "+19876543210",
                  total_bookings: 3,
                  preferred_staff: "staff_mike",
                },
              },
            ];

            const found = mockCustomers.find((c) => c.phone === rawPhone);
            if (found) {
              return {
                customer: found.customer,
                suggestions: {
                  name: found.customer.name,
                  email: found.customer.email,
                  phone: found.customer.phone,
                  preferredStaff: found.customer.preferred_staff,
                  preferredService: found.customer.preferred_service,
                  totalBookings: found.customer.total_bookings,
                  lastBooking: found.customer.last_booking_at,
                },
              };
            }
            return null;
          };

          const suggestion = mockCustomerLookup();

          if (suggestion) {
            setCustomerSuggestion(suggestion);
            setShowReturningCustomerBanner(true);

            // Auto-fill form with customer data
            setName(suggestion.suggestions.name);
            setEmail(suggestion.suggestions.email || "");

            // Suggest preferred staff/service
            if (suggestion.suggestions.preferredStaff && onStaffSuggestion) {
              onStaffSuggestion(suggestion.suggestions.preferredStaff);
            }
            if (
              suggestion.suggestions.preferredService &&
              onServiceSuggestion
            ) {
              onServiceSuggestion(suggestion.suggestions.preferredService);
            }
          } else {
            setCustomerSuggestion(null);
            setShowReturningCustomerBanner(false);
          }
        } catch (error) {
          console.error("Error looking up customer:", error);
        } finally {
          setIsLookingUp(false);
        }
      } else {
        setCustomerSuggestion(null);
        setShowReturningCustomerBanner(false);
      }
    };

    const debounceTimer = setTimeout(lookupCustomer, 500);
    return () => clearTimeout(debounceTimer);
  }, [phoneInput, onStaffSuggestion, onServiceSuggestion]);

  // Update parent component when customer data changes
  useEffect(() => {
    if (name && phoneInput) {
      onCustomerData({
        name: name.trim(),
        phone: phoneInput.replace(/\D/g, ""),
        email: email.trim() || undefined,
        isReturningCustomer: !!customerSuggestion,
        customerId: customerSuggestion?.customer.id,
      });
    }
  }, [name, phoneInput, email, customerSuggestion, onCustomerData]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value);
    setPhoneInput(formatted);
  };

  return (
    <div className="space-y-4">
      {/* Returning Customer Banner */}
      {showReturningCustomerBanner && customerSuggestion && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Welcome back, {customerSuggestion.customer.name}! 👋
              </h3>
              <div className="mt-1 text-sm text-green-700">
                <p>
                  You've booked with us{" "}
                  {customerSuggestion.customer.total_bookings} time
                  {customerSuggestion.customer.total_bookings !== 1 ? "s" : ""}.
                  {customerSuggestion.customer.last_booking_at && (
                    <span className="ml-1">
                      Last visit:{" "}
                      {new Date(
                        customerSuggestion.customer.last_booking_at
                      ).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Number Input */}
      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Phone Number *
        </label>
        <div className="relative">
          <input
            type="tel"
            id="phone"
            value={phoneInput}
            onChange={handlePhoneChange}
            className="block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-lg"
            placeholder="(555) 123-4567"
            maxLength={14}
            required
          />
          {isLookingUp && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg
                className="animate-spin h-5 w-5 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          We'll use this to find your booking history and send confirmations
        </p>
      </div>

      {/* Full Name Input */}
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-lg"
          placeholder="Enter your full name"
          required
          autoComplete="name"
        />
      </div>

      {/* Email Input (Optional) */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Email Address <span className="text-gray-400">(Optional)</span>
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-lg"
          placeholder="your@email.com"
          autoComplete="email"
        />
        <p className="mt-1 text-sm text-gray-500">
          For booking confirmations and appointment reminders
        </p>
      </div>

      {/* Customer Preferences (for returning customers) */}
      {customerSuggestion && (
        <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-purple-900 mb-2">
            Your Preferences
          </h4>
          <div className="space-y-1 text-sm text-purple-700">
            {customerSuggestion.customer.preferred_staff && (
              <p>
                • Usually books with: Staff Member #
                {customerSuggestion.customer.preferred_staff}
              </p>
            )}
            {customerSuggestion.customer.preferred_service && (
              <p>
                • Favorite service:{" "}
                {customerSuggestion.customer.preferred_service}
              </p>
            )}
            <p>
              • Member since:{" "}
              {new Date(
                customerSuggestion.customer.last_booking_at || Date.now()
              ).getFullYear()}
            </p>
          </div>
        </div>
      )}

      {/* Marketing Consent (for new customers) */}
      {!customerSuggestion && email && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="marketing-consent"
                name="marketing-consent"
                type="checkbox"
                className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="marketing-consent"
                className="font-medium text-gray-700"
              >
                Stay connected
              </label>
              <p className="text-gray-500">
                Receive appointment reminders, special offers, and salon news
                via email. You can unsubscribe at any time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

