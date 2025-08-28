Beauty Salon Booking System - MVP Specification
📋 Core Concept
A robust appointment booking system for one beauty salon with bulletproof conflict prevention and real-time availability. Mobile-first design with focus on technical excellence in booking logic.

🏪 Business Scope
Single Salon Setup

Salon name: "Downtown Beauty Lounge" (hardcoded for MVP)
Operating hours: Tuesday-Saturday, 9:00 AM - 6:00 PM (PST)
Time zone: Pacific Standard Time with ISO timestamps for future conversion
3 core services:

Haircut (60 minutes, base $65)
Hair Color (120 minutes, base $120)
Highlights (180 minutes, base $150)

3 staff members: Sarah (all services), Mike (cuts only), Lisa (color specialist)

Role-Based Access

1 Admin (salon owner): Full system control
2-3 Staff (stylists): Personal schedule management only

👥 User Management & Permissions
Authentication System (Simplified)

Admin creates all accounts: Email + password for each staff member
Password hashing: Secure bcrypt storage in database
No self-registration: Admin manually onboards staff
Role assignment: Admin or Staff role set during account creation

Pricing Structure (Two-Level)

Salon base pricing: Admin sets default service prices
Staff price overrides: Individual staff can adjust their rates per service
Display logic: Show staff-specific pricing during booking flow
Admin control: Can override any staff pricing adjustments

Admin Role Capabilities

Add staff members (email/password creation)
Set base salon pricing and override staff pricing
Edit any staff member's availability schedule
View master calendar (all staff schedules combined)
Manage all bookings across entire salon
Access customer CRM dashboard with guest tracking
View customer profiles, booking history, and analytics
Segment customers by value (VIP, Gold, Regular, New)
Export customer data and marketing lists

Staff Role Capabilities

Set personal availability (own schedule only)
Adjust personal service pricing (within admin approval)
View personal bookings and appointments
Update personal profile (photo, bio, services)

📅 Calendar & Scheduling System
React-Big-Calendar Configuration (Mobile-First)

Time intervals: 15-minute slots (9:00, 9:15, 9:30, etc.)
Mobile-optimized: Touch-friendly, swipe navigation, large tap targets
Multiple views: Day (mobile primary), Week, Month
Service duration blocking: No automatic buffer time - staff manage gaps
Color coding: Different colors per service type
ISO timestamp storage: PST display with future timezone flexibility

Staff Availability Management

Weekly patterns: Set recurring schedule
Date overrides: Handle time off using availability blocks
Mobile schedule editing: Touch-friendly interface for phones/tablets
Real-time updates: Changes reflect immediately on customer booking page
No buffer enforcement: Staff control their own appointment spacing

⚡ Robust Booking Engine (Core Differentiator)
5-Minute Hold System with Analytics

Slot reservation: When customer selects time, slot locked for 5 minutes
Countdown timer: Visual indicator showing remaining hold time
Conversion tracking: Record hold → booking success rate
Missed opportunity analytics: Track expired holds for business insights
Session management: Multiple customers can't hold same slot
Database-level conflicts: Atomic operations prevent race conditions

Customer Booking Flow (Mobile-First)

Service selection: Mobile-optimized service cards with pricing
Staff selection: Staff photos, bios, individual pricing display
Date picker: Mobile calendar, swipe between months
Time slot selection: Large touch targets, clear availability
Immediate hold: Selected slot locked with prominent countdown
Booking form: Simple name + phone (mobile keyboard optimization)
Confirmation popup: Success message with booking details

🛠️ Technical Architecture
Tech Stack (Mobile-First)

Frontend: Next.js 15 + React + Tailwind CSS (mobile-first responsive)
Calendar UI: React-Big-Calendar with mobile optimizations
Database: Neon PostgreSQL + Prisma ORM with ISO timestamps
Authentication: NextAuth.js with bcrypt password hashing
Real-time: Server-Sent Events (SSE) for live updates
Email notifications: EmailJS integration for booking confirmations
Deployment: Vercel + Neon cloud database

Database Schema (Updated)
javascriptUser (id, email, password_hash, role, created_at)

Staff (id, user_id, name, bio, photo_url, services[], created_at)

Service (id, name, duration_minutes, base_price, created_at)

StaffServicePricing (id, staff_id, service_id, custom_price) // Staff price overrides

StaffAvailability (id, staff_id, day_of_week, start_time, end_time, override_date)

Customer (id, phone, name, email, total_bookings, total_spent, last_booking_at, preferred_staff, preferred_service, marketing_consent, referral_source, notes, created_at, updated_at) // Guest CRM tracking

BookingHold (id, session_id, staff_id, service_id, slot_datetime, expires_at, created_at)

Booking (id, staff_id, service_id, slot_datetime, customer_name, customer_phone, customer_email, customer_id, final_price, created_at) // Enhanced with customer linking

HoldAnalytics (id, session_id, service_id, staff_id, held_at, expired_at, converted) // Conversion tracking

📱 User Interface Design (Mobile-First)
Mobile-Optimized Design Priorities

Large touch targets: Minimum 44px tap areas
Thumb-friendly navigation: Bottom navigation, reachable buttons
Minimal scrolling: Key actions above the fold
Fast loading: Optimized images, lazy loading
Offline graceful: Clear messaging when connection issues occur

Admin Dashboard (Mobile & Desktop)

Responsive master calendar: Stack view on mobile, side-by-side on desktop
Quick staff actions: Swipe gestures for common tasks
Staff management: Add/edit staff members, photo uploads, service assignments
Pricing management: Simple forms for base/staff price adjustments
Customer CRM: Guest customer tracking, segmentation, booking history
Touch-friendly schedule editing: Drag handles, modal forms

Staff Dashboard (Mobile-First)

Personal calendar: Full-screen mobile calendar view
Quick availability toggle: Swipe to block/unblock time slots
Price adjustment: Simple slider/input for service pricing
Appointment list: Card-based mobile layout

Customer Booking Page (Mobile-Optimized)

Service cards: Large images, clear pricing, easy tapping
Staff selection: Horizontal scroll cards with photos
Calendar widget: Mobile-native date picker feel
Hold timer: Prominent, non-intrusive countdown
Form inputs: Mobile keyboard optimization

📧 Communication System
EmailJS Integration (Simple)

Booking confirmations: Automated email with appointment details
Template system: Professional email templates
Fallback popup: If email fails, show confirmation popup
Admin notifications: Simple email alerts for new bookings
Future expansion: SMS integration roadmap mentioned but not implemented

🏪 Guest Customer CRM System
Phone-Based Customer Tracking (No Registration Required)

Automatic customer recognition: Phone number as unique identifier
Customer profile creation: Name, phone, optional email, booking history
Preference tracking: Favorite staff, preferred services, booking patterns
Revenue tracking: Total spent, booking frequency, customer lifetime value
Marketing consent: Optional email opt-in for promotions and reminders

CRM Features for Business Intelligence

Customer segmentation: VIP ($1000+), Gold ($500+), Regular (5+ bookings), New
Retention analytics: Identify inactive customers for re-engagement campaigns
Booking insights: Most popular services per customer, seasonal patterns
Staff preferences: Track which customers prefer specific staff members
Customer notes: Staff observations, allergies, preferences, special requests

Admin CRM Dashboard

Customer search: By name, phone, or email with instant results
Customer profiles: Complete booking history, spending patterns, preferences
Segmentation filters: View customers by spend level, booking frequency, activity
Revenue analytics: Track customer value, identify high-value segments
Marketing tools: Export email lists with consent tracking

Mobile-First Customer Lookup

Smart phone formatting: Automatic (XXX) XXX-XXXX formatting during input
Real-time lookup: Customer recognition within 500ms of phone entry
Auto-fill forms: Pre-populate name and email for returning customers
Preference suggestions: Auto-suggest favorite staff and services
Welcome banners: Personalized greetings showing booking history

📊 Basic Analytics (Phase 2 Priority)
Conversion Tracking Dashboard

Hold conversion rate: Percentage of holds that become bookings
Popular time slots: Heat map of booking patterns
Staff utilization: Booking density per staff member
Service popularity: Most/least requested services
Missed opportunities: Expired holds analysis
Simple charts: Basic bar/line charts for business insights

⏱️ Development Timeline (2-3 Weeks)
Week 1: Foundation & Mobile-First UI

Days 1-2: Database setup, authentication, password hashing
Days 3-4: Mobile-first React-Big-Calendar integration
Days 5: Staff pricing system, admin interface, guest customer CRM system

Week 2: Booking Engine & Real-time

Days 6-7: 5-minute hold system with conversion tracking
Days 8-9: Customer booking flow, mobile optimization
Days 10: Real-time availability updates, conflict prevention

Week 3: Communication & Analytics

Days 11-12: EmailJS integration, booking confirmations
Days 13-14: Basic analytics dashboard, missed opportunity tracking
Day 15: Mobile testing, performance optimization, demo prep

🎯 Success Metrics
Technical Validation

Zero double-bookings under concurrent mobile usage
5-minute hold system reliable across mobile sessions
Mobile performance: Sub-3 second load times on 3G
Cross-device sync: Real-time updates mobile ↔ desktop
Touch responsiveness: All interactions under 100ms

Business Validation

Mobile booking flow: Complete appointment in under 2 minutes on phone
Staff mobile usage: Update schedule in under 1 minute on mobile
Conversion tracking: Measure hold-to-booking success rates
Demo readiness: Professional mobile interface for presentations

🚀 Technical Notes & Future Considerations
Integration Roadmap (Mentioned, Not Implemented)

POS system connections: Architecture supports future payment integration
Google Calendar sync: ISO timestamp structure enables easy calendar exports
SMS notifications: Twilio integration pathway planned
Multi-location expansion: Database schema accommodates future scaling

Time Zone Strategy

Current: PST hardcoded with ISO timestamp storage
Future ready: Database structure supports timezone conversion
React-Big-Calendar: Verify timezone support during implementation

Cancellation/Rescheduling (Future)

Policy framework: 24-hour cancellation policy noted for future implementation
Database structure: Booking status field supports future workflow states

🔧 Implementation Dependencies
Core Packages
json{
"dependencies": {
"next": "^14.0.0",
"react": "^18.0.0",
"react-big-calendar": "^1.19.4",
"moment": "^2.29.4",
"tailwindcss": "^3.3.0",
"@prisma/client": "^5.6.0",
"prisma": "^5.6.0",
"next-auth": "^4.24.0",
"bcryptjs": "^2.4.3",
"@emailjs/browser": "^3.11.0",
"date-fns": "^2.30.0",
"swr": "^2.2.0"
}
}
Environment Variables
bashDATABASE_URL=neon_postgres_connection_string
NEXTAUTH_SECRET=random_secret_key
NEXTAUTH_URL=http://localhost:3000
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key

📝 Notes
This MVP specification focuses on delivering a robust, mobile-first booking system that demonstrates technical excellence while maintaining a manageable scope for a 2-3 week development timeline. The emphasis on conflict prevention and real-time updates provides a competitive advantage over existing solutions like Fresha.
The mobile-first approach ensures practical usability for salon staff who primarily use mobile devices, while the conversion analytics provide business insights that justify the platform's value to salon owners.
