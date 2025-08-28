import { PrismaClient, UserRole, DayOfWeek } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting BeautiBook seed...");

  // Clear existing data (for development)
  await prisma.holdAnalytics.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.bookingHold.deleteMany();
  await prisma.staffAvailability.deleteMany();
  await prisma.staffServicePricing.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // Create services (hardcoded for BeautiBook)
  console.log("Creating services...");
  const haircut = await prisma.service.create({
    data: {
      name: "Haircut",
      duration_minutes: 60,
      base_price: 6500, // $65.00 in cents
    },
  });

  const hairColor = await prisma.service.create({
    data: {
      name: "Hair Color",
      duration_minutes: 120,
      base_price: 12000, // $120.00 in cents
    },
  });

  const highlights = await prisma.service.create({
    data: {
      name: "Highlights",
      duration_minutes: 180,
      base_price: 15000, // $150.00 in cents
    },
  });

  // Create admin user
  console.log("Creating admin user...");
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@beautibook.com",
      password_hash: await bcrypt.hash("admin123", 12),
      role: UserRole.ADMIN,
    },
  });

  // Create staff users
  console.log("Creating staff users...");
  const sarahUser = await prisma.user.create({
    data: {
      email: "sarah@beautibook.com",
      password_hash: await bcrypt.hash("sarah123", 12),
      role: UserRole.STAFF,
    },
  });

  const mikeUser = await prisma.user.create({
    data: {
      email: "mike@beautibook.com",
      password_hash: await bcrypt.hash("mike123", 12),
      role: UserRole.STAFF,
    },
  });

  const lisaUser = await prisma.user.create({
    data: {
      email: "lisa@beautibook.com",
      password_hash: await bcrypt.hash("lisa123", 12),
      role: UserRole.STAFF,
    },
  });

  // Create staff profiles
  console.log("Creating staff profiles...");

  // Sarah - All services
  const sarah = await prisma.staff.create({
    data: {
      user_id: sarahUser.id,
      name: "Sarah Johnson",
      bio: "Senior stylist with 10+ years experience. Specializes in cuts, color, and highlights.",
      services: [haircut.id, hairColor.id, highlights.id],
    },
  });

  // Mike - Cuts only
  const mike = await prisma.staff.create({
    data: {
      user_id: mikeUser.id,
      name: "Mike Rodriguez",
      bio: "Expert barber and precision cutting specialist. Perfect for all hair types.",
      services: [haircut.id],
    },
  });

  // Lisa - Color specialist
  const lisa = await prisma.staff.create({
    data: {
      user_id: lisaUser.id,
      name: "Lisa Chen",
      bio: "Color correction specialist with expertise in highlights and balayage techniques.",
      services: [hairColor.id, highlights.id],
    },
  });

  // Create staff availability (Tue-Sat, 9AM-6PM PST)
  console.log("Creating staff availability schedules...");

  const workDays = [
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];

  // Create availability for all staff
  for (const staff of [sarah, mike, lisa]) {
    for (const day of workDays) {
      await prisma.staffAvailability.create({
        data: {
          staff_id: staff.id,
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
        },
      });
    }
  }

  // Create sample staff pricing overrides
  console.log("Creating staff pricing overrides...");

  // Sarah charges premium for her expertise
  await prisma.staffServicePricing.create({
    data: {
      staff_id: sarah.id,
      service_id: haircut.id,
      custom_price: 7500, // $75 vs base $65
    },
  });

  await prisma.staffServicePricing.create({
    data: {
      staff_id: sarah.id,
      service_id: hairColor.id,
      custom_price: 13500, // $135 vs base $120
    },
  });

  // Lisa charges premium for color services
  await prisma.staffServicePricing.create({
    data: {
      staff_id: lisa.id,
      service_id: highlights.id,
      custom_price: 16500, // $165 vs base $150
    },
  });

  // Create sample customers for CRM testing
  console.log("Creating sample customers...");

  const customers = [
    {
      name: "Emma Wilson",
      phone: "+15551234567",
      email: "emma.wilson@email.com",
      total_bookings: 8,
      total_spent: 64000, // $640
      last_booking_at: new Date(2024, 11, 10), // Recent
      preferred_staff: sarah.id,
      preferred_service: hairColor.id,
      marketing_consent: true,
      referral_source: "Google Search",
      notes:
        "Prefers afternoon appointments. Allergic to certain hair products.",
    },
    {
      name: "David Chen",
      phone: "+15559876543",
      email: "david.chen@email.com",
      total_bookings: 15,
      total_spent: 125000, // $1,250 - VIP
      last_booking_at: new Date(2024, 11, 15),
      preferred_staff: sarah.id,
      preferred_service: haircut.id,
      marketing_consent: true,
      referral_source: "Word of mouth",
      notes: "Regular customer. Prefers Sarah for all services.",
    },
    {
      name: "Sarah Johnson",
      phone: "+15555551234",
      total_bookings: 3,
      total_spent: 19500, // $195
      last_booking_at: new Date(2024, 10, 20),
      marketing_consent: false,
      referral_source: "Walk-in",
    },
    {
      name: "Michael Rodriguez",
      phone: "+15554567890",
      email: "mike.r@email.com",
      total_bookings: 6,
      total_spent: 52000, // $520 - Gold
      last_booking_at: new Date(2024, 9, 15), // Inactive (older than 30 days)
      preferred_staff: mike.id,
      preferred_service: haircut.id,
      marketing_consent: true,
      referral_source: "Instagram",
      notes: "Quick appointments, always on time.",
    },
    {
      name: "Lisa Thompson",
      phone: "+15557891234",
      email: "lisa.t@email.com",
      total_bookings: 2,
      total_spent: 15000, // $150 - New customer
      last_booking_at: new Date(), // Today
      preferred_staff: lisa.id,
      preferred_service: highlights.id,
      marketing_consent: true,
      referral_source: "Facebook",
      notes: "New customer, very happy with service.",
    },
  ];

  for (const customerData of customers) {
    await prisma.customer.create({
      data: customerData,
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log("👨‍💼 Admin: admin@beautibook.com / admin123");
  console.log("👩‍💼 Staff Sarah: sarah@beautibook.com / sarah123");
  console.log("👨‍💼 Staff Mike: mike@beautibook.com / mike123");
  console.log("👩‍💼 Staff Lisa: lisa@beautibook.com / lisa123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
