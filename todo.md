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

- [ ] **Create customer service** (`lib/services/CustomerService.ts`)

  - [ ] Implement singleton pattern with getInstance()
  - [ ] Add findOrCreateGuestCustomer() for phone-based identification
  - [ ] Implement customer search and lookup functionality
  - [ ] Add customer statistics calculation (total spent, preferred staff/service)
  - [ ] Create customer insights and analytics methods

- [ ] **Enhanced booking with CRM** (`lib/services/BookingWithCRMService.ts`)

  - [ ] Integrate CustomerService with BookingService
  - [ ] Add createBookingWithCRM() method
  - [ ] Implement customer history tracking
  - [ ] Add quick customer lookup functionality

- [ ] **Admin CRM dashboard** (`components/Admin/CustomerCRMContent.tsx`)

  - [ ] Create customer list with search and filtering
  - [ ] Add customer segmentation (VIP, Gold, Regular, New)
  - [ ] Implement customer detail modal with booking history
  - [ ] Add customer statistics dashboard
  - [ ] Create mobile-responsive CRM interface

- [ ] **Customer lookup form** (`components/Booking/CustomerLookupForm.tsx`)

  - [ ] Smart phone number formatting and validation
  - [ ] Real-time customer lookup with debouncing
  - [ ] Auto-fill customer data for returning customers
  - [ ] Welcome banner for recognized customers
  - [ ] Marketing consent handling for new customers

- [ ] **Customer API endpoints** (`app/api/customers/lookup/route.ts`)
  - [ ] GET customer lookup by phone or email
  - [ ] POST customer search for admin interface
  - [ ] Input validation with Zod schemas
  - [ ] Error handling and response formatting

### Customer Management Integration

- [ ] **Add customer management to admin navigation** (`components/Admin/AdminNavigation.tsx`)

  - [ ] Add "Customer CRM" navigation item with customer icon
  - [ ] Update navigation state management for customer routes
  - [ ] Ensure mobile navigation includes customer management
  - [ ] Add active state highlighting for customer routes

- [ ] **Create customer management page** (`app/admin/customers/page.tsx`)

  - [ ] Integrate CustomerCRMContent component
  - [ ] Add page metadata and SEO optimization
  - [ ] Implement proper loading and error states
  - [ ] Add breadcrumb navigation

- [ ] **Customer management route protection** (`middleware.ts`)
  - [ ] Ensure `/admin/customers/*` routes are protected
  - [ ] Add proper role-based access control
  - [ ] Handle unauthorized access gracefully

---

## ⚡ Phase 4: Booking Engine & Hold System (Days 6-7)

### 5-Minute Hold System

- [ ] **Implement BookingHoldService** (`lib/services/BookingHoldService.ts`)

  - [ ] Add singleton pattern implementation
  - [ ] Create `createHold(sessionId, staffId, serviceId, slotDateTime)` method
  - [ ] Implement 5-minute expiration with setTimeout cleanup
  - [ ] Add database cleanup for expired holds
  - [ ] Track hold analytics (created, expired, converted)

- [ ] **Database transaction logic** (`lib/services/BookingService.ts`)
  - [ ] Implement atomic booking creation with Prisma transactions
  - [ ] Add optimistic locking for conflict prevention
  - [ ] Validate time slot availability before booking
  - [ ] Handle race conditions with proper serialization

### Hold Analytics Tracking

- [ ] **Create analytics tracking** (`lib/services/AnalyticsService.ts`)
  - [ ] Track hold creation events
  - [ ] Track hold expiration events
  - [ ] Track hold-to-booking conversion rates
  - [ ] Store session data for conversion analysis

### API Endpoints

- [ ] **Availability API** (`app/api/availability/route.ts`)

  - [ ] GET available time slots for staff/service/date
  - [ ] Factor in existing bookings and holds
  - [ ] Return 15-minute slot intervals
  - [ ] Handle PST timezone conversion

- [ ] **Hold management API** (`app/api/holds/route.ts`)
  - [ ] POST create new hold with session validation
  - [ ] DELETE release hold before expiration
  - [ ] GET check hold status with countdown timer
  - [ ] Handle expired hold cleanup

---

## 📱 Phase 5: Customer Booking Flow (Days 8-9)

### Customer Booking Interface

- [ ] **Service selection page** (`app/booking/page.tsx`)

  - [ ] Mobile-optimized service cards with images
  - [ ] Clear pricing display with staff variations
  - [ ] Large touch targets for service selection
  - [ ] Service duration and description display

- [ ] **Staff selection page** (`app/booking/staff/page.tsx`)

  - [ ] Staff photo cards with bios and specialties
  - [ ] Individual pricing display per staff member
  - [ ] Horizontal scroll for mobile optimization
  - [ ] Staff availability indicators

- [ ] **Date & time selection** (`app/booking/datetime/page.tsx`)
  - [ ] Mobile-native date picker feel
  - [ ] Swipe between months navigation
  - [ ] Available time slots with large touch targets
  - [ ] Real-time availability updates

### Booking Hold Interface

- [ ] **Hold countdown component** (`components/Booking/HoldCountdown.tsx`)

  - [ ] Prominent 5-minute countdown timer
  - [ ] Visual progress indicator
  - [ ] Non-intrusive placement on booking form
  - [ ] Auto-redirect on expiration

- [ ] **Booking form** (`app/booking/confirm/page.tsx`)
  - [ ] Simple name + phone fields only
  - [ ] Mobile keyboard optimization (tel input)
  - [ ] Clear booking summary display
  - [ ] Large confirm button (44px minimum)

### Success & Confirmation

- [ ] **Booking confirmation** (`app/booking/success/page.tsx`)
  - [ ] Success message with booking details
  - [ ] Add to calendar functionality
  - [ ] Contact information display
  - [ ] Return to booking link

---

## 🔄 Phase 6: Real-time Updates & SSE (Day 10)

### Server-Sent Events Setup

- [ ] **SSE endpoint** (`app/api/sse/route.ts`)

  - [ ] Implement EventSource connection handling
  - [ ] Use EventEmitter for real-time notifications
  - [ ] Handle client connections and disconnections
  - [ ] Broadcast booking updates to all clients

- [ ] **SSE client integration** (`lib/hooks/useSSE.ts`)
  - [ ] Custom hook for SSE connection management
  - [ ] Automatic reconnection with exponential backoff
  - [ ] Event filtering for relevant updates
  - [ ] Graceful degradation when SSE unavailable

### Real-time Features

- [ ] **Live availability updates**

  - [ ] Update calendar when bookings are made
  - [ ] Show holds in real-time to prevent conflicts
  - [ ] Update staff schedules when availability changes
  - [ ] Refresh pricing when admin makes changes

- [ ] **Hold status broadcasting**
  - [ ] Notify when slots are held by other customers
  - [ ] Update availability immediately on booking
  - [ ] Show expired holds in real-time
  - [ ] Broadcast booking confirmations

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
