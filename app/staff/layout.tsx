import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import StaffNavigation from "@/components/Staff/StaffNavigation";

interface StaffLayoutProps {
  children: React.ReactNode;
}

export default async function StaffLayout({ children }: StaffLayoutProps) {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/staff");
  }

  // Redirect if not staff or admin
  if (
    session.user.role !== UserRole.STAFF &&
    session.user.role !== UserRole.ADMIN
  ) {
    redirect("/auth/signin?error=AccessDenied");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first staff interface */}
      <div className="flex flex-col lg:flex-row">
        {/* Navigation - Mobile bottom, Desktop left */}
        <StaffNavigation />

        {/* Main Content Area - Full screen for mobile calendar */}
        <main className="flex-1 lg:ml-64">
          {/* Header - Compact for mobile */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Staff Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome, {session.user.name || session.user.email}
                </p>
              </div>

              {/* Quick Status Toggle */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">Available</span>
                  <button
                    type="button"
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 bg-green-600"
                    role="switch"
                    aria-checked="true"
                  >
                    <span className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out translate-x-5"></span>
                  </button>
                </div>

                {/* Profile Avatar */}
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(session.user.name ||
                      session.user.email)?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content - No padding for full-screen calendar */}
          <div className="lg:p-6 pb-20 lg:pb-6">{children}</div>
        </main>
      </div>
    </div>
  );
}




