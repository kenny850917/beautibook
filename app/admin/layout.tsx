import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import AdminNavigation from "@/components/Admin/AdminNavigation";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not admin
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/auth/signin?error=AccessDenied");
  }

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden flex flex-col lg:flex-row">
      {/* Navigation Sidebar - Mobile bottom, Desktop left */}
      <AdminNavigation />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {session.user.name || session.user.email}
              </span>
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(session.user.name ||
                    session.user.email)?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Flex-1 with proper containment */}
        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 lg:p-5 pb-20 lg:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}
