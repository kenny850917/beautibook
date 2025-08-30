"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface AuthError {
  title: string;
  description: string;
  action: string;
  actionUrl: string;
}

const errorMessages: Record<string, AuthError> = {
  Configuration: {
    title: "Configuration Error",
    description:
      "There is a problem with the server configuration. Please try again later.",
    action: "Try again",
    actionUrl: "/auth/signin",
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to access this resource.",
    action: "Sign in with different account",
    actionUrl: "/auth/signin",
  },
  Verification: {
    title: "Verification Error",
    description: "The verification link has expired or is invalid.",
    action: "Request new verification",
    actionUrl: "/auth/signin",
  },
  Default: {
    title: "Authentication Error",
    description:
      "An unexpected error occurred during authentication. Please try again.",
    action: "Sign in",
    actionUrl: "/auth/signin",
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const [errorInfo, setErrorInfo] = useState<AuthError>(errorMessages.Default);

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error && errorMessages[error]) {
      setErrorInfo(errorMessages[error]);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <h1 className="text-3xl font-bold text-purple-600">BeautiBook</h1>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Error icon */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>

          {/* Error content */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {errorInfo.title}
            </h2>
            <p className="text-gray-600 mb-6">{errorInfo.description}</p>

            {/* Action button - Touch-friendly 44px minimum */}
            <div className="space-y-4">
              <Link
                href={errorInfo.actionUrl}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] items-center"
              >
                {errorInfo.action}
              </Link>

              {/* Back to home link */}
              <Link
                href="/"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] items-center"
              >
                Back to home
              </Link>
            </div>
          </div>

          {/* Help text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              If you continue to experience issues, please contact salon
              support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}








