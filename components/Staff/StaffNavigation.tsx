"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  current?: boolean;
}

export default function StaffNavigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation: NavItem[] = [
    {
      name: "Schedule",
      href: "/staff",
      icon: (
        <svg
          className="h-5 w-5"
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
      ),
    },
    {
      name: "Availability",
      href: "/staff/availability",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: "My Services",
      href: "/staff/services",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
    },
    {
      name: "Profile",
      href: "/staff/profile",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  // Add current state to navigation items
  const navigationWithCurrent = navigation.map((item) => ({
    ...item,
    current: pathname === item.href,
  }));

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-purple-600">
                BeautiBook Staff
              </h1>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 px-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-900 mb-2">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full bg-purple-600 text-white px-3 py-2 rounded-md text-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    Mark Unavailable
                  </button>
                  <button className="w-full bg-white text-purple-600 border border-purple-600 px-3 py-2 rounded-md text-sm hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    View Today
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-8 flex-1 px-2 bg-white space-y-1">
              {navigationWithCurrent.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? "bg-purple-100 text-purple-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`mr-3 flex-shrink-0 ${
                      item.current
                        ? "text-purple-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Sign Out Button */}
            <div className="flex-shrink-0 px-2 pb-2">
              <button
                onClick={handleSignOut}
                className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <svg
                  className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500"
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
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile menu button */}
        <div className="flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200">
          <h1 className="text-lg font-bold text-purple-600">Staff</h1>
          <button
            type="button"
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="bg-white border-b border-gray-200">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {navigationWithCurrent.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md min-h-[44px] ${
                    item.current
                      ? "bg-purple-100 text-purple-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span
                    className={`mr-3 flex-shrink-0 ${
                      item.current ? "text-purple-500" : "text-gray-400"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ))}

              {/* Mobile Sign Out */}
              <button
                onClick={handleSignOut}
                className="group flex items-center w-full px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 min-h-[44px]"
              >
                <svg
                  className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400"
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
                Sign Out
              </button>
            </nav>

            {/* Mobile Quick Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-purple-600 text-white px-3 py-2 rounded-md text-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]">
                  Mark Unavailable
                </button>
                <button className="bg-white text-purple-600 border border-purple-600 px-3 py-2 rounded-md text-sm hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]">
                  View Today
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


