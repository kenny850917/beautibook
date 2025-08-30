"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface AppointmentDetails {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    serviceName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    price: number;
    status: "CONFIRMED" | "PENDING" | "CANCELLED" | "NOSHOW"; // Match database enum format
    notes?: string;
    staffId?: string;
    staffName?: string;
  };
}

interface AppointmentEditModalProps {
  appointment: AppointmentDetails;
  onClose: () => void;
  onSave: (updatedAppointment: AppointmentDetails) => Promise<void>;
  isStaffView?: boolean; // true for staff, false for admin
  className?: string;
}

const statusOptions = [
  {
    value: "confirmed",
    label: "Confirmed",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "pending",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "noshow", label: "No Show", color: "bg-gray-100 text-gray-800" },
];

export default function AppointmentEditModal({
  appointment,
  onClose,
  onSave,
  isStaffView = false,
  className = "",
}: AppointmentEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Convert database status format (uppercase) to frontend format (lowercase)
  const convertDbStatusToFrontend = (dbStatus: string): string => {
    console.log("[MODAL] Converting DB status:", dbStatus);
    const statusMap = {
      CONFIRMED: "confirmed",
      PENDING: "pending",
      CANCELLED: "cancelled",
      NOSHOW: "noshow",
    } as const;
    const converted =
      statusMap[dbStatus as keyof typeof statusMap] || "confirmed";
    console.log("[MODAL] Converted to frontend status:", converted);
    return converted;
  };

  const [formData, setFormData] = useState({
    customerName: appointment.resource.customerName,
    customerPhone: appointment.resource.customerPhone,
    customerEmail: appointment.resource.customerEmail || "",
    price: appointment.resource.price,
    status: convertDbStatusToFrontend(appointment.resource.status),
    notes: appointment.resource.notes || "",
  });

  // Update form data when appointment changes
  useEffect(() => {
    console.log(
      "[MODAL] Appointment status from DB:",
      appointment.resource.status
    );
    const convertedStatus = convertDbStatusToFrontend(
      appointment.resource.status
    );
    console.log("[MODAL] Converted status for form:", convertedStatus);

    setFormData({
      customerName: appointment.resource.customerName,
      customerPhone: appointment.resource.customerPhone,
      customerEmail: appointment.resource.customerEmail || "",
      price: appointment.resource.price,
      status: convertedStatus,
      notes: appointment.resource.notes || "",
    });
  }, [appointment]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatPhone = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
      return digits.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    }

    return phone;
  };

  const handlePhoneChange = (value: string) => {
    setFormData((prev) => ({ ...prev, customerPhone: formatPhone(value) }));
  };

  const handlePriceChange = (value: string) => {
    // Convert dollars to cents
    const dollars = parseFloat(value) || 0;
    const cents = Math.round(dollars * 100);
    setFormData((prev) => ({ ...prev, price: cents }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      console.log("[MODAL] Form data status before save:", formData.status);
      console.log("[MODAL] All form data:", formData);

      // Convert frontend status (lowercase) back to database format (uppercase)
      const convertFrontendStatusToDb = (frontendStatus: string): string => {
        const statusMap = {
          confirmed: "CONFIRMED",
          pending: "PENDING",
          cancelled: "CANCELLED",
          noshow: "NOSHOW",
        } as const;
        return (
          statusMap[frontendStatus as keyof typeof statusMap] || "CONFIRMED"
        );
      };

      const dbStatus = convertFrontendStatusToDb(formData.status);
      console.log(
        "[MODAL] Converting frontend status to DB:",
        formData.status,
        "→",
        dbStatus
      );

      const updatedAppointment: AppointmentDetails = {
        ...appointment,
        resource: {
          ...appointment.resource,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          price: formData.price,
          status: dbStatus as typeof appointment.resource.status,
          notes: formData.notes,
        },
      };

      console.log(
        "[MODAL] Sending to parent onSave:",
        updatedAppointment.resource
      );
      await onSave(updatedAppointment);
      onClose();
    } catch (error) {
      console.error("Error saving appointment:", error);
      alert("Failed to save appointment changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption?.color || "bg-gray-100 text-gray-800";
  };

  return (
    <div
      className={`fixed inset-0 flex items-start justify-center pt-10 z-50 ${className}`}
    >
      {/* Blur overlay */}
      <div
        className="absolute inset-0 backdrop-blur-sm bg-white/30"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Edit Appointment
              </h3>
              <p className="text-sm text-gray-600">
                {format(appointment.start, "EEEE, MMMM d, yyyy")} at{" "}
                {format(appointment.start, "h:mm a")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Service Info (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                {appointment.resource.serviceName}
              </div>
            </div>

            {/* Staff Info (Admin view only) */}
            {!isStaffView && appointment.resource.staffName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Member
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                  {appointment.resource.staffName}
                </div>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label
                htmlFor="customerName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Customer Name
              </label>
              <input
                type="text"
                id="customerName"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label
                htmlFor="customerPhone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="(555) 123-4567"
                required
              />
            </div>

            {/* Customer Email */}
            <div>
              <label
                htmlFor="customerEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email (Optional)
              </label>
              <input
                type="email"
                id="customerEmail"
                value={formData.customerEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerEmail: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="customer@example.com"
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="price"
                  step="0.01"
                  min="0"
                  value={(formData.price / 100).toFixed(2)}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as
                      | "confirmed"
                      | "pending"
                      | "cancelled"
                      | "noshow",
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    formData.status
                  )}`}
                >
                  {
                    statusOptions.find((opt) => opt.value === formData.status)
                      ?.label
                  }
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add any notes about this appointment..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                isLoading || !formData.customerName || !formData.customerPhone
              }
              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
