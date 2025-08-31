import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { ClientProviders } from "./providers";
import { SignOutButton } from "../components/SignOutButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BeautiBook - Beauty Salon Booking System",
  description:
    "Professional salon booking system with 5-minute hold technology",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BeautiBook",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8B5CF6",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="h-full">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-gray-50 antialiased`}
      >
        <ClientProviders session={session}>
          <div className="min-h-full">
            {/* Mobile-first responsive navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  {/* Logo */}
                  <div className="flex items-center">
                    <Link
                      href="/"
                      className="text-xl font-bold text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      BeautiBook
                    </Link>
                  </div>

                  {/* Desktop Navigation - Hidden on mobile */}
                  <div className="hidden md:flex items-center space-x-8">
                    <a
                      href="/booking"
                      className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                    >
                      Book Appointment
                    </a>
                    {session?.user?.role === "ADMIN" && (
                      <a
                        href="/admin"
                        className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                      >
                        Admin
                      </a>
                    )}
                    {session?.user?.role === "STAFF" && (
                      <a
                        href="/staff"
                        className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                      >
                        Staff
                      </a>
                    )}
                    {session?.user ? (
                      <SignOutButton className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                        Sign Out
                      </SignOutButton>
                    ) : (
                      <a
                        href="/auth/signin"
                        className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                      >
                        Sign In
                      </a>
                    )}
                  </div>

                  {/* Mobile menu button */}
                  <div className="md:hidden">
                    <button
                      type="button"
                      className="bg-gray-50 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
                      aria-expanded="false"
                    >
                      <span className="sr-only">Open main menu</span>
                      {/* Hamburger icon */}
                      <svg
                        className="h-6 w-6"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </nav>

            {/* Main content */}
            <main className="flex-1">{children}</main>

            {/* Mobile bottom navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
              <div className="grid grid-cols-3 py-2">
                {/* Book button - primary action */}
                <a
                  href="/booking"
                  className="flex flex-col items-center py-2 px-4 text-purple-600 font-medium"
                >
                  <svg
                    className="h-6 w-6 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs">Book</span>
                </a>

                {/* Role-based portal - Admin or Staff, never both */}
                {session?.user?.role === "ADMIN" && (
                  <a
                    href="/admin"
                    className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-purple-600"
                  >
                    <svg
                      className="h-6 w-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-xs">Admin</span>
                  </a>
                )}

                {session?.user?.role === "STAFF" && (
                  <a
                    href="/staff"
                    className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-purple-600"
                  >
                    <svg
                      className="h-6 w-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                      />
                    </svg>
                    <span className="text-xs">Staff</span>
                  </a>
                )}

                {/* Sign In/Out */}
                {session?.user ? (
                  <SignOutButton className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-purple-600">
                    <svg
                      className="h-6 w-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="text-xs">Sign Out</span>
                  </SignOutButton>
                ) : (
                  <a
                    href="/auth/signin"
                    className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-purple-600"
                  >
                    <svg
                      className="h-6 w-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="text-xs">Sign In</span>
                  </a>
                )}
              </div>
            </nav>

            {/* Spacer for mobile bottom nav */}
            <div className="md:hidden h-16"></div>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
