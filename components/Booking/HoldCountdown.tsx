"use client";

/**
 * Hold Countdown Component
 * Displays 5-minute countdown with visual progress indicator
 */

import { useState, useEffect } from "react";
import { Timer, AlertTriangle } from "lucide-react";

interface HoldCountdownProps {
  expiryTime: Date;
  onExpired: () => void;
}

export function HoldCountdown({ expiryTime, onExpired }: HoldCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);

  // Check for invalid expiry time
  const isValidExpiry = expiryTime && !isNaN(expiryTime.getTime());

  useEffect(() => {
    if (!isValidExpiry) {
      console.error("HoldCountdown: Invalid expiryTime provided:", expiryTime);
      return;
    }
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = expiryTime.getTime();

      // Handle invalid dates
      if (isNaN(expiry) || isNaN(now)) {
        console.error("Invalid expiry time:", expiryTime);
        setTimeLeft(0);
        setProgress(0);
        return;
      }

      const timeRemaining = expiry - now;

      if (timeRemaining <= 0) {
        setTimeLeft(0);
        setProgress(0);
        onExpired();
        return;
      }

      setTimeLeft(timeRemaining);

      // Calculate progress (5 minutes = 300,000 ms)
      const totalTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      const progressPercent = (timeRemaining / totalTime) * 100;
      setProgress(Math.max(0, Math.min(100, progressPercent)));
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiryTime, onExpired, isValidExpiry]);

  // Handle invalid expiry time
  if (!isValidExpiry) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="text-center text-red-600">
          <Timer className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Hold timer error</p>
          <p className="text-sm">Please refresh and try again</p>
        </div>
      </div>
    );
  }

  const formatTime = (milliseconds: number) => {
    // Handle invalid input
    if (!milliseconds || milliseconds <= 0 || isNaN(milliseconds)) {
      return "0:00";
    }

    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    if (progress > 50) return "text-green-600 bg-green-50 border-green-200";
    if (progress > 20) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getProgressColor = () => {
    if (progress > 50) return "bg-green-500";
    if (progress > 20) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getProgressBackgroundColor = () => {
    if (progress > 50) return "bg-green-100";
    if (progress > 20) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (timeLeft <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900">Hold Expired</h3>
            <p className="text-sm text-red-700">
              Your booking hold has expired. Redirecting you to select a new
              time...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-xl p-6 transition-all duration-500 ${getStatusColor()}`}
    >
      <div className="flex items-center space-x-4">
        {/* Timer icon and countdown */}
        <div className="flex-shrink-0">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center relative ${
              progress > 50
                ? "bg-green-100"
                : progress > 20
                ? "bg-yellow-100"
                : "bg-red-100"
            }`}
          >
            {/* Circular progress background */}
            <svg
              className="w-16 h-16 absolute inset-0 transform -rotate-90"
              viewBox="0 0 64 64"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="opacity-20"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(progress / 100) * 175.929} 175.929`}
                className="transition-all duration-1000 ease-out"
                style={{
                  color:
                    progress > 50
                      ? "#10b981"
                      : progress > 20
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              />
            </svg>
            <Timer
              className={`w-6 h-6 relative z-10 ${
                progress > 50
                  ? "text-green-600"
                  : progress > 20
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            />
          </div>
        </div>

        {/* Countdown text and progress bar */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {progress > 20 ? "Time Remaining" : "Hurry Up!"}
            </h3>
            <span className="text-2xl font-bold font-mono">
              {formatTime(timeLeft)}
            </span>
          </div>

          <p className="text-sm opacity-80">
            {progress > 50
              ? "Your appointment is being held. Complete your booking to secure this time slot."
              : progress > 20
              ? "Your hold is expiring soon. Please complete your booking quickly."
              : "Your hold expires very soon! Complete your booking now to secure this slot."}
          </p>

          {/* Linear progress bar */}
          <div
            className={`w-full h-2 rounded-full overflow-hidden ${getProgressBackgroundColor()}`}
          >
            <div
              className={`h-full transition-all duration-1000 ease-out ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Warning message for low time */}
      {progress <= 20 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 font-medium">
              ⚠️ Your booking will be automatically released in{" "}
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
