"use client";

/**
 * Booking Success Content
 * Shows booking confirmation details with add to calendar and contact options
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  Calendar,
  Phone,
  MapPin,
  Clock,
  User,
  DollarSign,
  Download,
  MessageSquare,
  Home,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { parseIsoToPstComponents } from "@/lib/utils/calendar";

interface Booking {
  id: string;
  staff_id: string;
  service_id: string;
  slot_datetime: string;
  customer_name: string;
  customer_phone: string;
  final_price: number;
  created_at: string;
  staff?: {
    name: string;
    photo_url: string | null;
  };
  service?: {
    name: string;
    duration_minutes: number;
  };
}

export function BookingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      router.push("/booking");
      return;
    }
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch booking details");
      }

      const data = await response.json();
      setBooking(data.booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      setError("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (datetime: string) => {
    const components = parseIsoToPstComponents(datetime);
    const dateObj = parseISO(components.date + "T00:00:00");
    return {
      date: format(dateObj, "EEEE, MMMM d, yyyy"),
      time: components.display,
    };
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(0)}`;
  };

  const generateCalendarUrl = () => {
    if (!booking) return "";

    const startDate = parseISO(booking.slot_datetime);
    const endDate = new Date(
      startDate.getTime() + (booking.service?.duration_minutes || 60) * 60000
    );

    const formatForCalendar = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Beauty Appointment - ${booking.service?.name}`,
      dates: `${formatForCalendar(startDate)}/${formatForCalendar(endDate)}`,
      details: `Appointment with ${booking.staff?.name} for ${booking.service?.name}`,
      location: "BeautiBook Salon",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateICSFile = () => {
    if (!booking) return;

    const startDate = parseISO(booking.slot_datetime);
    const endDate = new Date(
      startDate.getTime() + (booking.service?.duration_minutes || 60) * 60000
    );

    const formatForICS = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BeautiBook//Booking//EN",
      "BEGIN:VEVENT",
      `UID:booking-${booking.id}@beautibook.com`,
      `DTSTAMP:${formatForICS(new Date())}`,
      `DTSTART:${formatForICS(startDate)}`,
      `DTEND:${formatForICS(endDate)}`,
      `SUMMARY:Beauty Appointment - ${booking.service?.name}`,
      `DESCRIPTION:Appointment with ${booking.staff?.name} for ${booking.service?.name}`,
      "LOCATION:BeautiBook Salon",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `booking-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Booking Not Found
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          {error || "We couldn't find your booking details."}
        </p>
        <button
          onClick={() => router.push("/booking")}
          className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Home className="w-4 h-4 mr-2" />
          Book Another Appointment
        </button>
      </div>
    );
  }

  const { date, time } = formatDateTime(booking.slot_datetime);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success animation */}
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600">
          Your appointment has been successfully booked. We look forward to
          seeing you!
        </p>
      </div>

      {/* Booking details */}
      <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Appointment Details
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Service</p>
              <p className="font-medium text-gray-900">
                {booking.service?.name}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Stylist</p>
              <p className="font-medium text-gray-900">{booking.staff?.name}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium text-gray-900">{date}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-medium text-gray-900">{time}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-medium text-gray-900">
                {formatPrice(booking.final_price)}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium text-gray-900">
                {booking.customer_name}
              </p>
              <p className="text-sm text-gray-600">{booking.customer_phone}</p>
            </div>
          </div>
        </div>

        {/* Booking ID */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Booking ID: <span className="font-mono">{booking.id}</span>
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Add to calendar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={generateCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Add to Google Calendar
          </a>
          <button
            onClick={generateICSFile}
            className="flex items-center justify-center px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download .ics File
          </button>
        </div>

        {/* Contact and navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="tel:+1234567890"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Salon
          </a>
          <button
            onClick={() => router.push("/booking")}
            className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Book Another
          </button>
        </div>
      </div>

      {/* Important information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">
              Important Information
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Please arrive 5 minutes early for your appointment</li>
              <li>• Cancellations require 24 hours notice</li>
              <li>• We&apos;ll send you a reminder the day before</li>
              <li>• Bring any inspiration photos or color references</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contact information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MapPin className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Salon Location</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>BeautiBook Salon</p>
          <p>123 Beauty Street</p>
          <p>Vancouver, BC V1V1V1</p>
          <p className="mt-2">
            <Phone className="w-4 h-4 inline mr-1" />
            (555) 123-4567
          </p>
        </div>
      </div>
    </div>
  );
}
