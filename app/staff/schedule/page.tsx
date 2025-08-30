import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import StaffScheduleEditor from "@/components/Staff/StaffScheduleEditor";

export const metadata = {
  title: "Manage Schedule - Staff Portal",
  description: "Update your availability and request time off",
};

export default async function StaffSchedulePage() {
  // Verify staff authentication
  const session = await getServerSession(authOptions);

  if (!session?.user || !["STAFF", "ADMIN"].includes(session.user.role)) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <StaffScheduleEditor />
      </div>
    </div>
  );
}

