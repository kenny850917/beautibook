"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("BeautiBook Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Oops! Something went wrong
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;re sorry, but something unexpected happened. Please try
            again.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={reset}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            Try again
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            Go to homepage
          </button>

          {/* Contact support for salon staff */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Still having issues?{" "}
              <a
                href="mailto:support@beautibook.com"
                className="text-purple-600 hover:text-purple-500"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>

        {/* Error details for development */}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-4 p-4 bg-red-50 rounded-md">
            <summary className="text-sm font-medium text-red-800 cursor-pointer">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap break-words">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
