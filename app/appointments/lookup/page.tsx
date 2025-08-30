import { Metadata } from "next";
// import { GuestAppointmentLookup } from "@/components/Guest/AppointmentLookup";

export const metadata: Metadata = {
  title: "Appointment Lookup | BeautiBook",
  description: "Look up your appointments by phone number",
};

/**
 * Guest Appointment Lookup Page
 * Allows customers to view their bookings without creating an account
 * Mobile-first design with phone number verification
 */
export default function GuestLookupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            Find Your Appointments
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Enter your phone number to view your bookings
          </p>
        </div>
      </div>

      {/* Main Content */}
      {/* <div className="max-w-md mx-auto px-4 py-8">
        <GuestAppointmentLookup />
      </div> */}

      {/* Footer Help */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">Need help with your appointment?</p>
          <p className="font-medium text-gray-700">
            Call us at{" "}
            <a
              href="tel:+15551234567"
              className="text-pink-600 hover:text-pink-700 underline"
            >
              (555) 123-4567
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
