# BeautiBook MVP Development Roadmap

## 📋 Overview

Beauty salon booking system with 5-minute hold system, mobile-first design, and real-time updates.

**Target**: 2-3 week MVP with core booking functionality for "BeautiBook"

---

## 🏗️ Phase 1: Foundation & Database Setup (Days 1-2)

### Database Schema & Prisma Setup

- [x] **Setup Neon PostgreSQL database**

  - [x] Create Neon project and get connection string
  - [x] Add `DATABASE_URL` to `.env.local`
  - [x] Test connection with `npx prisma db push`

- [x] **Create Prisma schema** (`prisma/schema.prisma`)

  - [x] Define `User` model (id, email, password_hash, role, created_at)
  - [x] Define `Staff` model (id, user_id, name, bio, photo_url, services[], created_at)
  - [x] Define `Service` model (id, name, duration_minutes, base_price, created_at)
  - [x] Define `StaffServicePricing` model (id, staff_id, service_id, custom_price)
  - [x] Define `StaffAvailability` model (id, staff_id, day_of_week, start_time, end_time, override_date)
  - [x] Define `BookingHold` model (id, session_id, staff_id, service_id, slot_datetime, expires_at, created_at)
  - [x] Define `Booking` model (id, staff_id, service_id, slot_datetime, customer_name, customer_phone, final_price, created_at)
  - [x] Define `HoldAnalytics` model (id, session_id, service_id, staff_id, held_at, expired_at, converted)

- [x] **Create seed data** (`prisma/seed.ts`)
  - [x] Seed hardcoded services: Haircut (60min, $65), Hair Color (120min, $120), Highlights (180min, $150)
  - [x] Seed staff: Sarah (all services), Mike (cuts only), Lisa (color specialist)
  - [x] Seed admin user and staff user accounts
  - [x] Seed basic availability schedules (Tue-Sat, 9AM-6PM PST)

### Authentication Setup

- [x] **Install and configure NextAuth.js**

  - [x] Install `next-auth`, `bcryptjs`, `@next-auth/prisma-adapter`
  - [x] Create `lib/auth.ts` with NextAuth configuration
  - [x] Setup database session strategy
  - [x] Configure JWT with `NEXTAUTH_SECRET`
  - [x] Add role-based callbacks for Admin/Staff roles

- [x] **Create authentication singleton service** (`lib/services/AuthService.ts`)

  - [x] Implement `getInstance()` pattern
  - [x] Add password hashing with bcryptjs (12 salt rounds)
  - [x] Add user creation and validation methods
  - [x] Add role-based authorization helpers

- [x] **Create authentication middleware** (`middleware.ts`)
  - [x] Protect `/admin/*` routes for Admin role only
  - [x] Protect `/staff/*` routes for Staff/Admin roles
  - [x] Allow public access to `/booking/*` customer routes

---

## 🎨 Phase 2: Mobile-First UI Foundation (Days 3-4)

### Layout & Navigation Setup

- [x] **Create mobile-first layout** (`app/layout.tsx`)

  - [x] Add Tailwind mobile-first viewport meta tags
  - [x] Setup responsive navigation with bottom nav for mobile
  - [x] Add session provider wrapper for NextAuth
  - [x] Implement error boundary with `error.tsx`

- [x] **Setup Tailwind configuration** (`tailwind.config.ts`)
  - [x] Define salon brand colors (primary, secondary, accent)
  - [x] Setup custom spacing scale (4, 8, 12, 16px multiples)
  - [x] Configure mobile-first breakpoints
  - [x] Add touch target utilities (min 44px)

### Calendar Integration Setup

- [x] **Install React-Big-Calendar dependencies**

  - [x] Install `react-big-calendar`, `date-fns`
  - [x] Create calendar utilities (`lib/utils/calendar.ts`)
  - [x] Setup PST timezone conversion helpers
  - [x] Create 15-minute time slot generators

- [x] **Create base calendar component** (`components/Calendar/BaseCalendar.tsx`)
  - [x] Setup mobile-optimized calendar views (day primary, week, month)
  - [x] Add touch-friendly event handling
  - [x] Implement custom toolbar for mobile navigation
  - [x] Add ARIA labels for accessibility

### Service Components

- [x] **Create singleton services** (`lib/services/`)
  - [x] `PrismaService.ts` - Database client singleton
  - [x] `AvailabilityService.ts` - Staff schedule management
  - [x] `BookingService.ts` - Booking logic and conflict prevention
  - [x] `EmailService.ts` - EmailJS integration
  - [x] `SSEService.ts` - Real-time updates

---

## 🔧 Phase 3: Admin Interface & Staff Management (Day 5) ✅ COMPLETED

### Admin Dashboard

- [x] **Create admin layout** (`app/admin/layout.tsx`)

  - [x] Responsive master calendar (stack on mobile, side-by-side desktop)
  - [x] Navigation sidebar with staff management, pricing, schedules
  - [x] Mobile-friendly touch targets (44px minimum)

- [x] **Staff management interface** (`app/admin/staff/page.tsx`)

  - [x] Display staff list with photos, services, availability
  - [x] Add/edit staff members with role assignment
  - [x] Upload staff photos (Next.js Image optimization)
  - [x] Edit staff service assignments and custom pricing

- [x] **Pricing management interface** (`app/admin/pricing/page.tsx`)
  - [x] Display base salon pricing for all services
  - [x] Show staff price overrides in comparison table
  - [x] Edit base prices and approve/override staff pricing
  - [x] Mobile-friendly forms with proper input types

### Staff Dashboard

- [x] **Create staff layout** (`app/staff/layout.tsx`)

  - [x] Personal calendar full-screen view for mobile
  - [x] Quick availability toggle controls
  - [x] Service pricing adjustment interface

- [x] **Staff calendar interface** (`app/staff/schedule/page.tsx`)
  - [x] Personal calendar showing only own appointments
  - [x] Availability toggle with swipe gestures
  - [x] Time-off request functionality
  - [x] Mobile-optimized appointment cards

### Guest Customer CRM System

- [x] **Create customer service** (`lib/services/CustomerService.ts`)

  - [x] Implement singleton pattern with getInstance()
  - [x] Add findOrCreateGuestCustomer() for phone-based identification
  - [x] Implement customer search and lookup functionality
  - [x] Add customer statistics calculation (total spent, preferred staff/service)
  - [x] Create customer insights and analytics methods

- [x] **Enhanced booking with CRM** (`lib/services/BookingWithCRMService.ts`)

  - [x] Integrate CustomerService with BookingService
  - [x] Add createBookingWithCRM() method
  - [x] Implement customer history tracking
  - [x] Add quick customer lookup functionality

- [x] **Admin CRM dashboard** (`components/Admin/CustomerCRMContent.tsx`)

  - [x] Create customer list with search and filtering
  - [x] Add customer segmentation (VIP, Gold, Regular, New)
  - [x] Implement customer detail modal with booking history
  - [x] Add customer statistics dashboard
  - [x] Create mobile-responsive CRM interface

- [x] **Customer lookup form** (`components/Booking/CustomerLookupForm.tsx`)

  - [x] Smart phone number formatting and validation
  - [x] Real-time customer lookup with debouncing
  - [x] Auto-fill customer data for returning customers
  - [x] Welcome banner for recognized customers
  - [x] Marketing consent handling for new customers

- [x] **Customer API endpoints** (`app/api/customers/lookup/route.ts`)
  - [x] GET customer lookup by phone or email
  - [x] POST customer search for admin interface
  - [x] Input validation with Zod schemas
  - [x] Error handling and response formatting

### Customer Management Integration

- [x] **Add customer management to admin navigation** (`components/Admin/AdminNavigation.tsx`)

  - [x] Add "Customer CRM" navigation item with customer icon
  - [x] Update navigation state management for customer routes
  - [x] Ensure mobile navigation includes customer management
  - [x] Add active state highlighting for customer routes

- [x] **Create customer management page** (`app/admin/customers/page.tsx`)

  - [x] Integrate CustomerCRMContent component
  - [x] Add page metadata and SEO optimization
  - [x] Implement proper loading and error states
  - [x] Add breadcrumb navigation

- [x] **Customer management route protection** (`middleware.ts`)
  - [x] Ensure `/admin/customers/*` routes are protected
  - [x] Add proper role-based access control
  - [x] Handle unauthorized access gracefully

---

## ⚡ Phase 4: Booking Engine & Hold System (Days 6-7) ✅ COMPLETED

### 5-Minute Hold System

- [x] **Implement BookingHoldService** (`lib/services/BookingHoldService.ts`)

  - [x] Add singleton pattern implementation
  - [x] Create `createHold(sessionId, staffId, serviceId, slotDateTime)` method
  - [x] Implement 5-minute expiration with setTimeout cleanup
  - [x] Add database cleanup for expired holds
  - [x] Track hold analytics (created, expired, converted)

- [x] **Database transaction logic** (`lib/services/BookingService.ts`)
  - [x] Implement atomic booking creation with Prisma transactions
  - [x] Add optimistic locking for conflict prevention
  - [x] Validate time slot availability before booking
  - [x] Handle race conditions with proper serialization

### Hold Analytics Tracking

- [x] **Create analytics tracking** (`lib/services/AnalyticsService.ts`)
  - [x] Track hold creation events
  - [x] Track hold expiration events
  - [x] Track hold-to-booking conversion rates
  - [x] Store session data for conversion analysis

### API Endpoints

- [x] **Availability API** (`app/api/availability/route.ts`)

  - [x] GET available time slots for staff/service/date
  - [x] Factor in existing bookings and holds
  - [x] Return 15-minute slot intervals
  - [x] Handle PST timezone conversion

- [x] **Hold management API** (`app/api/holds/route.ts`)
  - [x] POST create new hold with session validation
  - [x] DELETE release hold before expiration
  - [x] GET check hold status with countdown timer
  - [x] Handle expired hold cleanup

---

## 📱 Phase 5: Customer Booking Flow (Days 8-9) ✅ COMPLETED

### Customer Booking Interface

- [x] **Service selection page** (`app/booking/page.tsx`)

  - [x] Mobile-optimized service cards with images
  - [x] Clear pricing display with staff variations
  - [x] Large touch targets for service selection
  - [x] Service duration and description display

- [x] **Staff selection page** (`app/booking/staff/page.tsx`)

  - [x] Staff photo cards with bios and specialties
  - [x] Individual pricing display per staff member
  - [x] Horizontal scroll for mobile optimization
  - [x] Staff availability indicators

- [x] **Date & time selection** (`app/booking/datetime/page.tsx`)
  - [x] Mobile-native date picker feel
  - [x] Swipe between months navigation
  - [x] Available time slots with large touch targets
  - [x] Real-time availability updates

### Booking Hold Interface

- [x] **Hold countdown component** (`components/Booking/HoldCountdown.tsx`)

  - [x] Prominent 5-minute countdown timer
  - [x] Visual progress indicator
  - [x] Non-intrusive placement on booking form
  - [x] Auto-redirect on expiration

- [x] **Booking form** (`app/booking/confirm/page.tsx`)
  - [x] Simple name + phone fields only
  - [x] Mobile keyboard optimization (tel input)
  - [x] Clear booking summary display
  - [x] Large confirm button (44px minimum)

### Success & Confirmation

- [x] **Booking confirmation** (`app/booking/success/page.tsx`)
  - [x] Success message with booking details
  - [x] Add to calendar functionality
  - [x] Contact information display
  - [x] Return to booking link

---

## 🔄 Phase 6: Core Booking Fixes & Admin Integration (Day 10)

### Critical Booking System Fixes

- [x] **Fix slot validation with API checks** (`components/Booking/DateTimeSelectionContent.tsx`)

  - [x] Replace immediate navigation with API availability check
  - [x] Add loading state during slot validation
  - [x] Show error if slot becomes unavailable
  - [x] Refresh availability after failed validation
  - [x] Prevent double-booking through real-time validation

- [x] **Fix booking hold duration coverage** (`lib/services/BookingHoldService.ts`)

  - [x] Calculate required slots based on service duration
  - [x] Hold all consecutive 15-minute slots for service duration
  - [x] Example: 60-minute haircut = hold 4 consecutive slots
  - [x] Update hold creation logic to block entire duration
  - [x] Ensure holds release all slots simultaneously

### Admin Integration (Phase 3/5 Continuation)

- [x] **Staff management API integration** (`components/Admin/StaffManagementContent.tsx`)

  - [x] Convert from mock data to real API endpoints
  - [x] Implement staff editing functionality with forms
  - [x] Add/remove staff service assignments
  - [x] Update staff pricing overrides through interface
  - [ ] Handle staff photo uploads and profile updates

- [x] **Staff creation and removal system** (`components/Admin/StaffManagementContent.tsx`)

  - [x] Add "Create New Staff" functionality with user account creation
  - [x] Implement staff creation with auto-generated or custom temporary passwords
  - [x] Add staff removal with business logic validation
  - [x] Prevent removal of staff with upcoming appointments or active holds
  - [x] Preserve user records for historical booking data integrity
  - [x] Create admin protection (prevent removal of last admin user)

- [x] **Staff availability and schedule management** (`app/api/admin/staff/[id]/availability/route.ts`)

  - [x] Create staff availability API endpoints (GET, PUT for admin and staff)
  - [x] Implement weekly schedule management (days/times available)
  - [x] Add override dates for holidays/time-off requests
  - [x] Build staff schedule editing interface for admins (`StaffScheduleManagement.tsx`)
  - [x] Create staff portal schedule management for self-service (`StaffScheduleEditor.tsx`)
  - [x] Add schedule validation (time logic, conflict detection)
  - [x] Implement weekly schedule templates with 15-minute intervals
  - [x] Add schedule conflict detection with existing bookings and business logic

- [x] **Service management and pricing** (`app/admin/pricing/page.tsx`)

  - [x] Add "Add New Service" button to admin pricing page with modal
  - [x] Create service creation modal with name, duration, base price, description
  - [x] Implement service editing functionality for existing services
  - [x] Add service validation (prevent duplicate names, required fields)
  - [x] Build comprehensive staff pricing override management (full CRUD modal system)
  - [x] API endpoints for service creation (`POST /api/admin/services`)
  - [x] API endpoints for service editing (`PUT /api/admin/services/[id]`)
  - [x] Real-time service list updates after creation/editing
  - [x] Staff pricing override API endpoints (`POST/PUT/DELETE /api/admin/services/[id]/staff-pricing`)
  - [x] Staff pricing management modal with add/edit/delete functionality
  - [x] Real-time staff pricing updates and average price recalculation

### Guest Appointment Lookup

- [x] **Guest appointment lookup page** (`app/appointments/lookup/page.tsx`)

  - [x] Simple phone number input form
  - [x] Mobile-optimized design with large touch targets
  - [x] Loading states and error handling
  - [x] Security validation (phone + name verification)

- [x] **Guest lookup API** (`app/api/appointments/lookup/route.ts`)

  - [x] POST endpoint for guest appointment search
  - [x] Phone number validation and formatting
  - [x] Return upcoming and recent appointments
  - [x] Include booking details (date, time, service, staff)

- [ ] **Guest appointment display** (`components/Guest/AppointmentLookup.tsx`)
  - [ ] Recreate component (accidentally deleted during SSE cleanup)
  - [ ] Display upcoming appointments with countdown
  - [ ] Show past appointment history
  - [ ] Contact information for changes/cancellations
  - [ ] Mobile-friendly appointment cards

### Critical Timezone Issues Identified 🕐

- [x] **UTC Normalization Analysis** (`todo-utc-normalize.md`)
  - [x] Identified root cause: Overlapping hold creation causing 9:00 AM → 2:45 PM blocking
  - [x] Created comprehensive fix plan with 4-phase implementation
  - [x] Verified Prisma schema is correct (no changes needed)
  - [x] Documented 15 files requiring timezone fixes
  - [ ] **URGENT**: Implement Phase 1 fixes for hold system (production blocking)
  - [ ] **Follow `todo-utc-normalize.md` for detailed implementation steps**

---

## 📧 Phase 7: Email Integration (Days 11-12)

### EmailJS Setup

- [ ] **Configure EmailJS service**

  - [ ] Setup EmailJS account and service
  - [ ] Create professional booking confirmation template
  - [ ] Add environment variables (EMAILJS_SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY)
  - [ ] Test email delivery and formatting

- [ ] **Email templates** (`lib/templates/`)
  - [ ] Booking confirmation template with salon branding
  - [ ] Booking cancellation template (for future)
  - [ ] Staff notification template for new bookings
  - [ ] Admin notification template for system events

### Email Integration

- [ ] **EmailService implementation** (`lib/services/EmailService.ts`)

  - [ ] Singleton pattern with getInstance()
  - [ ] Send booking confirmation emails
  - [ ] Implement retry logic for failed sends
  - [ ] Fallback to confirmation popup if email fails
  - [ ] Log email success/failure for monitoring

- [ ] **Email API endpoint** (`app/api/email/route.ts`)
  - [ ] POST send booking confirmation
  - [ ] Validate email data with Zod schemas
  - [ ] Handle EmailJS API errors gracefully
  - [ ] Return success/failure status

---

## 📊 Phase 8: Analytics Dashboard (Days 13-14)

### Analytics Data Collection

- [ ] **Hold conversion tracking**

  - [ ] Track hold creation timestamps
  - [ ] Record hold expiration events
  - [ ] Calculate conversion percentages
  - [ ] Store missed opportunity data

- [ ] **Business metrics** (`lib/services/AnalyticsService.ts`)
  - [ ] Popular time slot analysis
  - [ ] Staff utilization rates
  - [ ] Service popularity tracking
  - [ ] Revenue by service/staff

### Admin Analytics Interface

- [ ] **Analytics dashboard** (`app/admin/analytics/page.tsx`)

  - [ ] Hold conversion rate charts
  - [ ] Popular time slots heat map
  - [ ] Staff booking density display
  - [ ] Service popularity rankings
  - [ ] Missed opportunities analysis

- [ ] **Simple charts implementation**
  - [ ] Use Chart.js or similar for basic visualizations
  - [ ] Mobile-responsive chart displays
  - [ ] Export data functionality
  - [ ] Date range filtering

---

## 🚀 Phase 9: Testing & Optimization (Day 15)

### Mobile Testing

- [ ] **Cross-device testing**

  - [ ] Test on actual mobile devices (iOS/Android)
  - [ ] Verify touch targets are 44px minimum
  - [ ] Test swipe gestures and navigation
  - [ ] Validate form inputs and mobile keyboards

- [ ] **Performance optimization**
  - [ ] Measure Core Web Vitals
  - [ ] Optimize images with Next.js Image
  - [ ] Test load times on 3G networks
  - [ ] Implement lazy loading for non-critical components

### Production Preparation

- [ ] **Environment setup**

  - [ ] Configure production environment variables
  - [ ] Setup Vercel deployment pipeline
  - [ ] Configure Neon production database
  - [ ] Test EmailJS in production environment

- [ ] **Final testing & demo prep**
  - [ ] End-to-end booking flow testing
  - [ ] Admin interface functionality verification
  - [ ] Staff dashboard testing
  - [ ] Real-time updates validation
  - [ ] Email delivery testing

---

## ✅ Success Criteria

### Technical Validation

- [ ] Zero double-bookings under concurrent usage
- [ ] 5-minute hold system working reliably
- [ ] Mobile load times under 3 seconds on 3G
- [ ] Real-time updates working across devices
- [ ] All touch interactions under 100ms response

### Business Validation

- [ ] Complete mobile booking flow under 2 minutes
- [ ] Staff schedule updates under 1 minute on mobile
- [ ] Hold-to-booking conversion tracking functional
- [ ] Professional demo-ready interface
- [ ] Salon workflow integration validated

---

## 📝 Development Notes

### Current Dependencies

```json
{
  "next": "^15.0.0",
  "react": "^18.0.0",
  "react-big-calendar": "^1.19.4",
  "date-fns": "^2.30.0",
  "tailwindcss": "^3.3.0",
  "@prisma/client": "^5.6.0",
  "next-auth": "^4.24.0",
  "bcryptjs": "^2.4.3",
  "@emailjs/browser": "^3.11.0"
}
```

### Environment Variables Required

- `DATABASE_URL` - Neon PostgreSQL connection
- `NEXTAUTH_SECRET` - NextAuth session secret
- `NEXTAUTH_URL` - Application URL
- `EMAILJS_SERVICE_ID` - EmailJS service ID
- `EMAILJS_TEMPLATE_ID` - Email template ID
- `EMAILJS_PUBLIC_KEY` - EmailJS public key

---

## 🔮 Future Enhancements (Post-MVP)

### Real-time Updates via Server-Sent Events

- [ ] **SSE endpoint implementation** (`app/api/sse/route.ts`)
- [ ] **SSE client integration** (`lib/hooks/useSSE.ts`) -
- [ ] **Live availability updates** - Replace API checks with real-time SSE updates
- [ ] **Hold status broadcasting** - Real-time notification of slot holds across browsers
- [ ] **Admin dashboard live updates** - Real-time booking notifications for staff
- [ ] **Customer notifications** - Push updates for booking changes/confirmations

### Advanced Features

- [ ] **Email/SMS notifications** - Automated reminders and confirmations
- [ ] **Customer loyalty program** - Points and rewards system
- [ ] **Advanced scheduling** - Recurring appointments and bulk booking
- [ ] **Payment integration** - Stripe/PayPal for online payments
- [ ] **Reviews and ratings** - Customer feedback system
