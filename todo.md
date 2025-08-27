# BeautiBook MVP Development Roadmap

## 📋 Overview

Beauty salon booking system with 5-minute hold system, mobile-first design, and real-time updates.

**Target**: 2-3 week MVP with core booking functionality for "Downtown Beauty Lounge"

---

## 🏗️ Phase 1: Foundation & Database Setup (Days 1-2)

### Database Schema & Prisma Setup

- [ ] **Setup Neon PostgreSQL database**

  - [ ] Create Neon project and get connection string
  - [ ] Add `DATABASE_URL` to `.env.local`
  - [ ] Test connection with `npx prisma db push`

- [ ] **Create Prisma schema** (`prisma/schema.prisma`)

  - [ ] Define `User` model (id, email, password_hash, role, created_at)
  - [ ] Define `Staff` model (id, user_id, name, bio, photo_url, services[], created_at)
  - [ ] Define `Service` model (id, name, duration_minutes, base_price, created_at)
  - [ ] Define `StaffServicePricing` model (id, staff_id, service_id, custom_price)
  - [ ] Define `StaffAvailability` model (id, staff_id, day_of_week, start_time, end_time, override_date)
  - [ ] Define `BookingHold` model (id, session_id, staff_id, service_id, slot_datetime, expires_at, created_at)
  - [ ] Define `Booking` model (id, staff_id, service_id, slot_datetime, customer_name, customer_phone, final_price, created_at)
  - [ ] Define `HoldAnalytics` model (id, session_id, service_id, staff_id, held_at, expired_at, converted)

- [ ] **Create seed data** (`prisma/seed.ts`)
  - [ ] Seed hardcoded services: Haircut (60min, $65), Hair Color (120min, $120), Highlights (180min, $150)
  - [ ] Seed staff: Sarah (all services), Mike (cuts only), Lisa (color specialist)
  - [ ] Seed admin user and staff user accounts
  - [ ] Seed basic availability schedules (Tue-Sat, 9AM-6PM PST)

### Authentication Setup

- [ ] **Install and configure NextAuth.js**

  - [ ] Install `next-auth`, `bcryptjs`, `@next-auth/prisma-adapter`
  - [ ] Create `lib/auth.ts` with NextAuth configuration
  - [ ] Setup database session strategy
  - [ ] Configure JWT with `NEXTAUTH_SECRET`
  - [ ] Add role-based callbacks for Admin/Staff roles

- [ ] **Create authentication singleton service** (`lib/services/AuthService.ts`)

  - [ ] Implement `getInstance()` pattern
  - [ ] Add password hashing with bcryptjs (12 salt rounds)
  - [ ] Add user creation and validation methods
  - [ ] Add role-based authorization helpers

- [ ] **Create authentication middleware** (`middleware.ts`)
  - [ ] Protect `/admin/*` routes for Admin role only
  - [ ] Protect `/staff/*` routes for Staff/Admin roles
  - [ ] Allow public access to `/booking/*` customer routes

---

## 🎨 Phase 2: Mobile-First UI Foundation (Days 3-4)

### Layout & Navigation Setup

- [ ] **Create mobile-first layout** (`app/layout.tsx`)

  - [ ] Add Tailwind mobile-first viewport meta tags
  - [ ] Setup responsive navigation with bottom nav for mobile
  - [ ] Add session provider wrapper for NextAuth
  - [ ] Implement error boundary with `error.tsx`

- [ ] **Setup Tailwind configuration** (`tailwind.config.ts`)
  - [ ] Define salon brand colors (primary, secondary, accent)
  - [ ] Setup custom spacing scale (4, 8, 12, 16px multiples)
  - [ ] Configure mobile-first breakpoints
  - [ ] Add touch target utilities (min 44px)

### Calendar Integration Setup

- [ ] **Install React-Big-Calendar dependencies**

  - [ ] Install `react-big-calendar`, `date-fns`
  - [ ] Create calendar utilities (`lib/utils/calendar.ts`)
  - [ ] Setup PST timezone conversion helpers
  - [ ] Create 15-minute time slot generators

- [ ] **Create base calendar component** (`components/Calendar/BaseCalendar.tsx`)
  - [ ] Setup mobile-optimized calendar views (day primary, week, month)
  - [ ] Add touch-friendly event handling
  - [ ] Implement custom toolbar for mobile navigation
  - [ ] Add ARIA labels for accessibility

### Service Components

- [ ] **Create singleton services** (`lib/services/`)
  - [ ] `PrismaService.ts` - Database client singleton
  - [ ] `AvailabilityService.ts` - Staff schedule management
  - [ ] `BookingService.ts` - Booking logic and conflict prevention
  - [ ] `EmailService.ts` - EmailJS integration
  - [ ] `SSEService.ts` - Real-time updates

---

## 🔧 Phase 3: Admin Interface & Staff Management (Day 5)

### Admin Dashboard

- [ ] **Create admin layout** (`app/admin/layout.tsx`)

  - [ ] Responsive master calendar (stack on mobile, side-by-side desktop)
  - [ ] Navigation sidebar with staff management, pricing, schedules
  - [ ] Mobile-friendly touch targets (44px minimum)

- [ ] **Staff management interface** (`app/admin/staff/page.tsx`)

  - [ ] Display staff list with photos, services, availability
  - [ ] Add/edit staff members with role assignment
  - [ ] Upload staff photos (Next.js Image optimization)
  - [ ] Edit staff service assignments and custom pricing

- [ ] **Pricing management interface** (`app/admin/pricing/page.tsx`)
  - [ ] Display base salon pricing for all services
  - [ ] Show staff price overrides in comparison table
  - [ ] Edit base prices and approve/override staff pricing
  - [ ] Mobile-friendly forms with proper input types

### Staff Dashboard

- [ ] **Create staff layout** (`app/staff/layout.tsx`)

  - [ ] Personal calendar full-screen view for mobile
  - [ ] Quick availability toggle controls
  - [ ] Service pricing adjustment interface

- [ ] **Staff calendar interface** (`app/staff/schedule/page.tsx`)
  - [ ] Personal calendar showing only own appointments
  - [ ] Availability toggle with swipe gestures
  - [ ] Time-off request functionality
  - [ ] Mobile-optimized appointment cards

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
